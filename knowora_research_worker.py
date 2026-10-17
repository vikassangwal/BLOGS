
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Knowora Research Worker
Python 3.10+

- Reads the Knowora AI blueprint
- Uses a rolling 24-hour publication/update window
- Never treats crawl time as publication time
- Stores processed fingerprints in SQLite
- Creates JSON research packs for human review
- Does not publish articles automatically
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import (
    urljoin,
    urlparse,
    urlunparse,
    parse_qsl,
    urlencode,
)

import requests
from bs4 import BeautifulSoup

BLUEPRINT_URL = "https://www.knowora.in/ai-blueprint.json"

BASE_DIR = Path(
    os.environ.get("KNOWORA_DATA_DIR", "./knowora_research")
).resolve()

ACTIVE_DIR = BASE_DIR / "active"
LOG_DIR = BASE_DIR / "logs"
DB_FILE = BASE_DIR / "research.db"

ACTIVE_HOURS = 24
RUN_EVERY_SECONDS = 3600
REQUEST_TIMEOUT = (10, 25)
MAX_RETRIES = 3
MAX_LINKS_PER_SOURCE = 15
MAX_TEXT_CHARS = 30000

USER_AGENT = (
    "KnoworaResearchBot/2.0 "
    "(official-source research; https://www.knowora.in)"
)

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign",
    "utm_term", "utm_content", "fbclid", "gclid"
}

# This is a domain heuristic, not proof that a page is official.
OFFICIAL_SUFFIXES = (
    ".gov.in", ".nic.in", ".ac.in", ".edu.in"
)
OFFICIAL_EXACT = {
    "india.gov.in",
    "mygov.in",
}

BASE_DIR.mkdir(parents=True, exist_ok=True)
ACTIVE_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            LOG_DIR / "worker.log", encoding="utf-8"
        ),
    ],
)
logger = logging.getLogger("knowora")

session = requests.Session()
session.headers.update({
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/pdf,"
              "application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "hi,en-US;q=0.9,en;q=0.8",
})


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(
        microsecond=0
    ).isoformat()


def parse_date(value):
    """Parse a trustworthy machine-readable date when available."""
    if not value:
        return None

    value = str(value).strip()

    try:
        result = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
        if result.tzinfo is None:
            # A timezone-free timestamp is ambiguous.
            return None
        return result.astimezone(timezone.utc)
    except (ValueError, TypeError):
        pass

    try:
        result = parsedate_to_datetime(value)
        if result.tzinfo is None:
            return None
        return result.astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return None


def normalize_url(url, base=None):
    if not isinstance(url, str) or not url.strip():
        return ""

    if base:
        url = urljoin(base, url)

    parsed = urlparse(url.strip())

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return ""

    host = parsed.hostname.lower()
    if host.startswith("www."):
        host = host[4:]

    query = [
        (key, value)
        for key, value in parse_qsl(
            parsed.query, keep_blank_values=True
        )
        if key.lower() not in TRACKING_PARAMS
    ]

    path = parsed.path.rstrip("/")

    return urlunparse((
        parsed.scheme.lower(),
        host,
        path,
        "",
        urlencode(query, doseq=True),
        "",
    ))


def is_official_url(url):
    try:
        host = (urlparse(url).hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return (
            host in OFFICIAL_EXACT
            or any(host.endswith(s) for s in OFFICIAL_SUFFIXES)
        )
    except Exception:
        return False


def request_with_retry(url):
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(
                url,
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True,
            )
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            logger.warning(
                "Request %s/%s failed: %s (%s)",
                attempt, MAX_RETRIES, url, exc
            )
            if attempt < MAX_RETRIES:
                time.sleep(attempt * 2)

    raise RuntimeError(f"Request failed: {url}: {last_error}")


def connect_db():
    conn = sqlite3.connect(DB_FILE, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS processed (
            fingerprint TEXT PRIMARY KEY,
            canonical_url TEXT NOT NULL,
            title TEXT,
            published_at TEXT,
            first_seen_at TEXT NOT NULL,
            status TEXT NOT NULL,
            pack_path TEXT
        );

        CREATE TABLE IF NOT EXISTS source_status (
            source_url TEXT PRIMARY KEY,
            checked_at TEXT,
            success_at TEXT,
            error TEXT
        );
    """)
    conn.commit()
    return conn


def fetch_blueprint():
    response = request_with_retry(BLUEPRINT_URL)
    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Blueprint must be a JSON object")

    return data


def extract_sources(blueprint):
    """Read source records from nested blueprint structures."""
    results = []
    seen_urls = set()
    seen_ids = set()

    def walk(obj):
        if isinstance(obj, dict):
            url = (
                obj.get("url")
                or obj.get("official_url")
                or obj.get("website")
                or obj.get("link")
            )

            if isinstance(url, str):
                url = normalize_url(url)
                if url and url not in seen_urls:
                    source_id = str(
                        obj.get("id")
                        or obj.get("source_id")
                        or hashlib.sha256(
                            url.encode("utf-8")
                        ).hexdigest()[:16]
                    )

                    if source_id not in seen_ids:
                        results.append({
                            "id": source_id,
                            "name": str(
                                obj.get("name")
                                or obj.get("title")
                                or obj.get("organization")
                                or url
                            ),
                            "url": url,
                            "category": str(
                                obj.get("category") or ""
                            ),
                            "enabled": obj.get("enabled", True) is not False,
                        })
                        seen_urls.add(url)
                        seen_ids.add(source_id)

            for value in obj.values():
                if isinstance(value, (dict, list)):
                    walk(value)

        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(blueprint)

    # Only enabled sources are scanned.
    return [s for s in results if s["enabled"]]


def extract_page_date(soup, response):
    """
    Return (datetime, field_name).
    No crawl-time fallback is permitted.
    """
    candidates = []

    # Prefer explicit update timestamps over publication timestamps.
    for selector in [
        ('meta', 'property', 'article:modified_time', 'content'),
        ('meta', 'name', 'last-modified', 'content'),
        ('meta', 'itemprop', 'dateModified', 'content'),
        ('meta', 'property', 'og:updated_time', 'content'),
        ('meta', 'property', 'article:published_time', 'content'),
        ('meta', 'name', 'datePublished', 'content'),
        ('meta', 'itemprop', 'datePublished', 'content'),
        ('meta', 'name', 'pubdate', 'content'),
    ]:
        tag_name, attr, key, value_attr = selector
        tag = soup.find(tag_name, attrs={attr: key})
        if tag and tag.get(value_attr):
            candidates.append((tag.get(value_attr), key))

    # Schema.org JSON-LD dates.
    for tag in soup.find_all(
        "script", attrs={"type": "application/ld+json"}
    ):
        try:
            data = json.loads(tag.string or tag.get_text())
        except (ValueError, TypeError):
            continue

        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                for key in ("dateModified", "datePublished"):
                    if item.get(key):
                        candidates.append((item[key], key))
                graph = item.get("@graph")
                if isinstance(graph, list):
                    stack.extend(graph)

    # HTTP Last-Modified is a weaker fallback than page metadata.
    header_date = response.headers.get("Last-Modified")
    if header_date:
        candidates.append((header_date, "http_last_modified"))

    for value, field in candidates:
        parsed = parse_date(value)
        if parsed:
            return parsed, field

    return None, None


def page_title(soup, fallback):
    tag = soup.find("meta", attrs={"property": "og:title"})
    if tag and tag.get("content"):
        return tag["content"].strip()[:500]

    if soup.title and soup.title.get_text(strip=True):
        return soup.title.get_text(" ", strip=True)[:500]

    h1 = soup.find("h1")
    if h1:
        return h1.get_text(" ", strip=True)[:500]

    return fallback[:500]


def page_text(soup):
    for tag in soup([
        "script", "style", "noscript", "svg",
        "nav", "footer", "header"
    ]):
        tag.decompose()

    return re.sub(
        r"\n{3,}", "\n\n",
        soup.get_text("\n", strip=True)
    )[:MAX_TEXT_CHARS]


def fingerprint(url, title, published_at):
    value = "|".join([
        normalize_url(url),
        re.sub(r"\s+", " ", title.lower()).strip(),
        published_at or "",
    ])
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def save_pack(item):
    safe_id = item["event_id"]
    path = ACTIVE_DIR / f"{safe_id}.json"
    temp = path.with_suffix(".tmp")

    temp.write_text(
        json.dumps(item, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temp.replace(path)
    return str(path)


def already_processed(conn, fp):
    row = conn.execute(
        "SELECT fingerprint FROM processed WHERE fingerprint = ?",
        (fp,),
    ).fetchone()
    return row is not None


def store_processed(conn, item, fp, path):
    conn.execute("""
        INSERT OR IGNORE INTO processed
        (fingerprint, canonical_url, title, published_at,
         first_seen_at, status, pack_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        fp,
        item["canonical_url"],
        item["title"],
        item["published_at"],
        iso(utc_now()),
        item["status"],
        path,
    ))
    conn.commit()


def scan_source(source, conn):
    source_url = source["url"]
    checked_at = iso(utc_now())

    try:
        response = request_with_retry(source_url)
        content_type = response.headers.get(
            "Content-Type", ""
        ).lower()

        if "html" not in content_type and not content_type.startswith(""):
            raise ValueError(f"Unsupported content type: {content_type}")

        soup = BeautifulSoup(response.content, "html.parser")
        page_links = []
        seen = set()

        for tag in soup.find_all("a", href=True):
            link = normalize_url(tag.get("href", ""), response.url)
            if not link or link in seen:
                continue
            seen.add(link)

            # Source links are discovery leads; final candidates must
            # have an official-looking destination domain.
            if not is_official_url(link):
                continue

            label = tag.get_text(" ", strip=True)
            if not label:
                label = link

            page_links.append((link, label[:500]))

            if len(page_links) >= MAX_LINKS_PER_SOURCE:
                break

        saved = 0
        cutoff = utc_now() - timedelta(hours=ACTIVE_HOURS)

        for link, label in page_links:
            try:
                detail_response = request_with_retry(link)
                detail_type = detail_response.headers.get(
                    "Content-Type", ""
                ).lower()

                if "html" not in detail_type:
                    continue

                detail_soup = BeautifulSoup(
                    detail_response.content, "html.parser"
                )

                published_dt, date_field = extract_page_date(
                    detail_soup, detail_response
                )

                if published_dt is None:
                    logger.info(
                        "Review only; no verified timestamp: %s",
                        link,
                    )
                    continue

                now = utc_now()

                if published_dt > now + timedelta(minutes=5):
                    logger.info("Reject future-dated page: %s", link)
                    continue

                if published_dt < cutoff:
                    continue

                title = page_title(detail_soup, label)
                text = page_text(detail_soup)
                canonical = normalize_url(
                    link, detail_response.url
                )

                fp = fingerprint(
                    canonical, title, iso(published_dt)
                )

                if already_processed(conn, fp):
                    continue

                event_id = fp[:24]
                item = {
                    "event_id": event_id,
                    "title": title,
                    "canonical_url": canonical,
                    "source_name": source["name"],
                    "source_directory_url": source_url,
                    "category": source.get("category", ""),
                    "published_at": iso(published_dt),
                    "timestamp_field": date_field,
                    "timestamp_verified": True,
                    "discovered_at": iso(now),
                    "expires_at": iso(
                        published_dt + timedelta(hours=ACTIVE_HOURS)
                    ),
                    "status": "READY_FOR_HUMAN_REVIEW",
                    "official_domain_check": is_official_url(canonical),
                    "important_information": text[:12000],
                    "vacancy": None,
                    "eligibility": None,
                    "salary": None,
                    "dates_extracted_from_document": [],
                    "note": (
                        "Verify the original notice/PDF before publishing. "
                        "This worker does not infer missing facts."
                    ),
                }

                path = save_pack(item)
                store_processed(conn, item, fp, path)
                saved += 1

                logger.info("Research pack created: %s", path)

            except Exception:
                logger.exception("Failed to inspect candidate: %s", link)

        conn.execute("""
            INSERT INTO source_status
            (source_url, checked_at, success_at, error)
            VALUES (?, ?, ?, NULL)
            ON CONFLICT(source_url) DO UPDATE SET
                checked_at=excluded.checked_at,
                success_at=excluded.success_at,
                error=NULL
        """, (source_url, checked_at, checked_at))
        conn.commit()

        logger.info(
            "Source complete: %s | candidates saved=%s",
            source_url, saved
        )

    except Exception as exc:
        logger.exception("Source failed: %s", source_url)
        conn.execute("""
            INSERT INTO source_status
            (source_url, checked_at, success_at, error)
            VALUES (?, ?, NULL, ?)
            ON CONFLICT(source_url) DO UPDATE SET
                checked_at=excluded.checked_at,
                error=excluded.error
        """, (source_url, checked_at, str(exc)[:1000]))
        conn.commit()


def run_once():
    logger.info("Starting Knowora research run")
    blueprint = fetch_blueprint()
    sources = extract_sources(blueprint)

    declared_count = blueprint.get("source_count")
    logger.info(
        "Blueprint declared source_count=%s; enabled unique sources=%s",
        declared_count, len(sources)
    )

    if not sources:
        raise RuntimeError("No enabled source URLs found in blueprint")

    conn = connect_db()
    try:
        for index, source in enumerate(sources, start=1):
            logger.info(
                "Scanning source %s/%s: %s",
                index, len(sources), source["name"]
            )
            scan_source(source, conn)
    finally:
        conn.close()

    logger.info("Research run finished")


def main():
    while True:
        started = time.monotonic()
        try:
            run_once()
        except Exception:
            logger.exception("Research run failed")

        elapsed = time.monotonic() - started
        sleep_for = max(60, RUN_EVERY_SECONDS - int(elapsed))
        logger.info("Sleeping for %s seconds", sleep_for)
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
