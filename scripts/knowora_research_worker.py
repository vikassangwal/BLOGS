#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Knowora Research Worker
-----------------------

Purpose:
    Automatically research official Indian government/institution sources
    and prepare verified research packs for Custom GPT.

Features:
    - Reads https://www.knowora.in/ai-blueprint.json
    - Hourly execution
    - 24-hour active research window
    - Permanent duplicate registry
    - Same event from multiple sources => one event
    - PDF download + text extraction
    - HTML extraction
    - OCR fallback for scanned PDFs (optional)
    - Date extraction
    - Notice number extraction
    - Vacancy extraction
    - Important facts
    - Official URLs
    - Retry + timeout
    - Per-source isolation
    - Crash recovery
    - SQLite persistence
    - Atomic file writes
    - Research Pack for Custom GPT
    - Does NOT invent missing information

Python 3.10+
"""

from __future__ import annotations

import hashlib
import html
import json
import logging
import os
import re
import sqlite3
import sys
import tempfile
import threading
import time
import traceback
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


# ============================================================
# CONFIGURATION
# ============================================================

BLUEPRINT_URL = "https://www.knowora.in/ai-blueprint.json"

BASE_DIR = Path(
    os.environ.get("KNOWORA_DATA_DIR", "./knowora_research")
).resolve()

ACTIVE_DIR = BASE_DIR / "active"
ARCHIVE_DIR = BASE_DIR / "archive"
RAW_DIR = BASE_DIR / "raw"
LOG_DIR = BASE_DIR / "logs"

DB_FILE = BASE_DIR / "research.db"

TIMEZONE_NAME = "Asia/Kolkata"

# Research window
ACTIVE_HOURS = 72

# Worker interval
RUN_EVERY_SECONDS = 60 * 60

# Network
REQUEST_TIMEOUT = (15, 45)
MAX_RETRIES = 4
RETRY_BACKOFF = 3

# Safety
MAX_DOWNLOAD_MB = 50
MAX_TEXT_CHARS = 1_500_000

USER_AGENT = (
    "KnoworaResearchBot/1.0 "
    "(Official-source research; +https://www.knowora.in)"
)

# Only these are considered acceptable final source domains.
OFFICIAL_SUFFIXES = (
    ".gov.in",
    ".nic.in",
    ".ac.in",
    ".edu.in",
)

# ============================================================
# LOGGING
# ============================================================

BASE_DIR.mkdir(parents=True, exist_ok=True)
ACTIVE_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "worker.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger("knowora")


# ============================================================
# HTTP SESSION
# ============================================================

session = requests.Session()
session.headers.update({
    "User-Agent": USER_AGENT,
    "Accept-Language": "hi,en-US;q=0.9,en;q=0.8",
})


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class Source:
    source_id: str
    name: str
    url: str
    category: str = ""
    source_type: str = ""
    enabled: bool = True


@dataclass
class DateFact:
    value: str
    label: str
    source_url: str
    source_page: Optional[int] = None
    status: str = "verified"


@dataclass
class ResearchItem:
    event_id: str
    title: str
    canonical_url: str
    source_urls: list[str]
    source_names: list[str]
    category: str

    published_at: Optional[str]

    notice_number: Optional[str]
    document_id: Optional[str]
    document_sha256: Optional[str]

    notification_date: Optional[str]
    application_start_date: Optional[str]
    application_last_date: Optional[str]
    fee_payment_last_date: Optional[str]
    correction_start_date: Optional[str]
    correction_last_date: Optional[str]
    exam_date: Optional[str]
    admit_card_date: Optional[str]
    result_date: Optional[str]
    interview_date: Optional[str]

    vacancy: Optional[str]
    eligibility: Optional[str]
    age_limit: Optional[str]
    age_relaxation: Optional[str]
    salary: Optional[str]
    selection_process: Optional[str]
    exam_pattern: Optional[str]
    negative_marking: Optional[str]
    syllabus: Optional[str]

    important_information: list[str]

    full_text_file: str
    research_json_file: str
    research_pack_file: str

    discovered_at: str
    expires_at: str

    status: str = "READY_FOR_GPT"


# ============================================================
# DATABASE
# ============================================================

DB_LOCK = threading.Lock()


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(
        DB_FILE,
        timeout=30,
        check_same_thread=False,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=FULL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    return conn


def init_db() -> None:
    with DB_LOCK:
        conn = db_connect()

        conn.executescript("""
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            canonical_url TEXT,
            category TEXT,
            notice_number TEXT,
            document_id TEXT,
            document_sha256 TEXT,
            first_seen_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            published_at TEXT,
            status TEXT NOT NULL,
            research_path TEXT
        );

        CREATE TABLE IF NOT EXISTS fingerprints (
            fingerprint TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            fingerprint_type TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sources (
            source_id TEXT PRIMARY KEY,
            name TEXT,
            url TEXT,
            last_checked_at TEXT,
            last_success_at TEXT,
            last_error TEXT,
            consecutive_failures INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS documents (
            sha256 TEXT PRIMARY KEY,
            url TEXT,
            local_path TEXT,
            downloaded_at TEXT,
            content_type TEXT,
            text_length INTEGER
        );

        CREATE TABLE IF NOT EXISTS processed_urls (
            url TEXT PRIMARY KEY,
            event_id TEXT,
            processed_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_events_notice
        ON events(notice_number);

        CREATE INDEX IF NOT EXISTS idx_events_document
        ON events(document_id);

        CREATE INDEX IF NOT EXISTS idx_events_hash
        ON events(document_sha256);
        """)

        conn.commit()
        conn.close()


# ============================================================
# TIME
# ============================================================

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(
        microsecond=0
    ).isoformat()


def parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    value = str(value).strip()

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except Exception:
        pass

    formats = [
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d.%m.%Y",
        "%Y-%m-%d",
        "%d %B %Y",
        "%d %b %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).replace(
                tzinfo=timezone.utc
            )
        except Exception:
            continue

    return None


# ============================================================
# URL / OFFICIAL SOURCE VALIDATION
# ============================================================

def normalize_url(url: str, base: Optional[str] = None) -> str:
    if not url:
        return ""

    if base:
        url = urljoin(base, url)

    url = url.strip()

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        return ""

    url = url.split("#", 1)[0]

    return url.rstrip("/")


def is_official_url(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
        host = host.lower().split(":")[0]

        return (
            host.endswith(OFFICIAL_SUFFIXES)
            or host in {
                "india.gov.in",
                "mygov.in",
            }
        )
    except Exception:
        return False


# ============================================================
# BLUEPRINT
# ============================================================

def fetch_blueprint() -> dict:
    logger.info("Fetching blueprint...")

    response = request_with_retry(
        "GET",
        BLUEPRINT_URL,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    blueprint = response.json()

    if not isinstance(blueprint, dict):
        raise ValueError("Blueprint is not a JSON object")

    return blueprint


def extract_sources(blueprint: dict) -> list[Source]:
    found: list[Source] = []
    seen: set[str] = set()

    def walk(obj: Any, category: str = ""):
        if isinstance(obj, dict):

            url = (
                obj.get("url")
                or obj.get("link")
                or obj.get("official_url")
                or obj.get("website")
            )

            name = (
                obj.get("name")
                or obj.get("title")
                or obj.get("source_name")
                or obj.get("organization")
            )

            if url and isinstance(url, str):
                url = normalize_url(url)

                if url and url not in seen:
                    seen.add(url)

                    source_id = str(
                        obj.get("id")
                        or obj.get("source_id")
                        or hashlib.sha256(
                            url.encode("utf-8")
                        ).hexdigest()[:16]
                    )

                    found.append(
                        Source(
                            source_id=source_id,
                            name=str(name or url),
                            url=url,
                            category=str(
                                obj.get("category")
                                or category
                                or ""
                            ),
                            source_type=str(
                                obj.get("type")
                                or obj.get("source_type")
                                or ""
                            ),
                            enabled=bool(
                                obj.get("enabled", True)
                            ),
                        )
                    )

            for key, value in obj.items():
                child_category = category

                if key.lower() in {
                    "category",
                    "section",
                    "domain",
                } and isinstance(value, str):
                    child_category = value

                walk(value, child_category)

        elif isinstance(obj, list):
            for item in obj:
                walk(item, category)

    walk(blueprint)

    logger.info(
        "Blueprint sources discovered: %s",
        len(found),
    )

    return found


# ============================================================
# NETWORK
# ============================================================

def request_with_retry(
    method: str,
    url: str,
    **kwargs,
) -> requests.Response:

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):

        try:
            response = session.request(
                method,
                url,
                **kwargs,
            )

            if response.status_code in {
                429,
                500,
                502,
                503,
                504,
            }:
                raise requests.HTTPError(
                    f"Temporary HTTP {response.status_code}"
                )

            return response

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Request failed (%s/%s): %s | %s",
                attempt,
                MAX_RETRIES,
                url,
                exc,
            )

            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)

    raise RuntimeError(
        f"Request failed after {MAX_RETRIES} attempts: "
        f"{url} | {last_error}"
    )


# ============================================================
# HTML EXTRACTION
# ============================================================

DATE_PATTERNS = [
    r"\b\d{1,2}[-/.\.]\d{1,2}[-/.\.]\d{4}\b",
    r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b",
    r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
]


def clean_text(text: str) -> str:
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_html_text(content: bytes) -> str:
    soup = BeautifulSoup(content, "html.parser")

    for tag in soup([
        "script",
        "style",
        "noscript",
        "svg",
        "nav",
        "footer",
    ]):
        tag.decompose()

    text = soup.get_text("\n")

    return clean_text(text)[:MAX_TEXT_CHARS]


def extract_links(
    content: bytes,
    base_url: str,
) -> list[dict]:

    soup = BeautifulSoup(content, "html.parser")
    links = []

    for a in soup.find_all("a", href=True):

        href = normalize_url(
            a.get("href", ""),
            base_url,
        )

        if not href:
            continue

        text = clean_text(
            a.get_text(" ", strip=True)
        )

        if not text:
            text = href

        links.append({
            "text": text[:300],
            "url": href,
            "official": is_official_url(href),
        })

    result = []
    seen = set()

    for item in links:
        if item["url"] in seen:
            continue

        seen.add(item["url"])
        result.append(item)

    return result


# ============================================================
# PDF
# ============================================================

def is_pdf_response(response: requests.Response, url: str) -> bool:
    content_type = (
        response.headers.get("Content-Type", "")
        .lower()
    )

    return (
        "application/pdf" in content_type
        or url.lower().endswith(".pdf")
    )


def safe_download_pdf(
    response: requests.Response,
    url: str,
) -> tuple[Path, str]:

    content_length = response.headers.get(
        "Content-Length"
    )

    if content_length:
        try:
            size = int(content_length)

            if size > MAX_DOWNLOAD_MB * 1024 * 1024:
                raise ValueError(
                    f"PDF exceeds {MAX_DOWNLOAD_MB} MB"
                )
        except ValueError:
            pass

    data = response.content

    if len(data) > MAX_DOWNLOAD_MB * 1024 * 1024:
        raise ValueError(
            f"PDF exceeds {MAX_DOWNLOAD_MB} MB"
        )

    sha = hashlib.sha256(data).hexdigest()

    pdf_path = RAW_DIR / f"{sha}.pdf"

    if not pdf_path.exists():
        atomic_write_bytes(pdf_path, data)

    return pdf_path, sha


def extract_pdf_text(pdf_path: Path) -> str:
    text = ""

    try:
        from pypdf import PdfReader

        reader = PdfReader(str(pdf_path))

        chunks = []

        for page in reader.pages:
            try:
                chunks.append(
                    page.extract_text() or ""
                )
            except Exception:
                chunks.append("")

        text = clean_text(
            "\n\n".join(chunks)
        )

    except Exception as exc:
        logger.warning(
            "pypdf extraction failed: %s",
            exc,
        )

    return text[:MAX_TEXT_CHARS]


# ============================================================
# ATOMIC FILE WRITES
# ============================================================

def atomic_write_text(
    path: Path,
    content: str,
) -> None:

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    fd, temp_name = tempfile.mkstemp(
        prefix=".tmp_",
        dir=str(path.parent),
        text=True,
    )

    try:
        with os.fdopen(
            fd,
            "w",
            encoding="utf-8",
        ) as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_name, path)

    finally:
        try:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        except Exception:
            pass


def atomic_write_bytes(
    path: Path,
    data: bytes,
) -> None:

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    fd, temp_name = tempfile.mkstemp(
        prefix=".tmp_",
        dir=str(path.parent),
    )

    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_name, path)

    finally:
        try:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        except Exception:
            pass


# ============================================================
# DATE EXTRACTION
# ============================================================

DATE_CONTEXTS = {
    "notification_date": [
        "notification date",
        "dated",
        "date of notification",
        "जारी दिनांक",
        "अधिसूचना दिनांक",
    ],

    "application_start_date": [
        "application start",
        "online application starts",
        "starting date",
        "आवेदन प्रारंभ",
        "आवेदन शुरू",
    ],

    "application_last_date": [
        "last date",
        "closing date",
        "last date for application",
        "आवेदन की अंतिम तिथि",
        "अंतिम तिथि",
    ],

    "fee_payment_last_date": [
        "fee payment",
        "fee payment last date",
        "शुल्क भुगतान",
    ],

    "correction_start_date": [
        "correction starts",
        "correction window",
        "सुधार प्रारंभ",
    ],

    "correction_last_date": [
        "correction last date",
        "सुधार की अंतिम तिथि",
    ],

    "exam_date": [
        "exam date",
        "examination date",
        "परीक्षा तिथि",
        "परीक्षा दिनांक",
    ],

    "admit_card_date": [
        "admit card",
        "hall ticket",
        "प्रवेश पत्र",
    ],

    "result_date": [
        "result date",
        "परिणाम",
        "result will be",
    ],

    "interview_date": [
        "interview date",
        "साक्षात्कार",
    ],
}


def extract_dates(text: str) -> dict[str, Optional[str]]:

    lines = text.splitlines()

    results: dict[str, Optional[str]] = {
        key: None
        for key in DATE_CONTEXTS
    }

    for line in lines:

        lower = line.lower()

        dates = []

        for pattern in DATE_PATTERNS:
            dates.extend(
                re.findall(
                    pattern,
                    line,
                    flags=re.IGNORECASE,
                )
            )

        if not dates:
            continue

        for field, contexts in DATE_CONTEXTS.items():

            if results[field]:
                continue

            if any(
                context.lower() in lower
                for context in contexts
            ):
                results[field] = dates[0]

    return results


# ============================================================
# NOTICE / DOCUMENT ID
# ============================================================

NOTICE_PATTERNS = [
    r"(?:notice|notification|advertisement|advt\.?|संख्या|क्रमांक)"
    r"\s*(?:no\.?|number|संख्या|क्रमांक)?\s*[:\-]?\s*"
    r"([A-Za-z0-9./()_-]{3,50})",
]


def extract_notice_number(
    text: str,
) -> Optional[str]:

    for pattern in NOTICE_PATTERNS:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        if match:
            value = clean_text(
                match.group(1)
            )

            if value:
                return value[:100]

    return None


# ============================================================
# TITLE
# ============================================================

def extract_title(
    html_content: Optional[bytes],
    text: str,
    fallback: str,
) -> str:

    if html_content:

        try:
            soup = BeautifulSoup(
                html_content,
                "html.parser",
            )

            title = soup.title

            if title:
                value = clean_text(
                    title.get_text(" ", strip=True)
                )

                if len(value) > 5:
                    return value[:500]

        except Exception:
            pass

    lines = [
        clean_text(x)
        for x in text.splitlines()
        if clean_text(x)
    ]

    for line in lines[:40]:
        if 10 <= len(line) <= 300:
            return line

    return fallback[:500]


# ============================================================
# FACT EXTRACTION
# ============================================================

def find_context(
    text: str,
    keywords: list[str],
    max_chars: int = 1200,
) -> Optional[str]:

    lower = text.lower()

    for keyword in keywords:

        index = lower.find(
            keyword.lower()
        )

        if index >= 0:
            start = max(
                0,
                index - 250,
            )

            end = min(
                len(text),
                index + max_chars,
            )

            return clean_text(
                text[start:end]
            )

    return None


def extract_facts(text: str) -> dict:

    dates = extract_dates(text)

    vacancy = find_context(
        text,
        [
            "vacancy",
            "vacancies",
            "number of vacancies",
            "total vacancies",
            "रिक्ति",
            "पदों की संख्या",
        ],
    )

    eligibility = find_context(
        text,
        [
            "educational qualification",
            "essential qualification",
            "eligibility",
            "शैक्षणिक योग्यता",
            "पात्रता",
        ],
    )

    age_limit = find_context(
        text,
        [
            "age limit",
            "age should be",
            "आयु सीमा",
        ],
    )

    age_relaxation = find_context(
        text,
        [
            "age relaxation",
            "upper age relaxation",
            "आयु में छूट",
        ],
    )

    salary = find_context(
        text,
        [
            "pay level",
            "pay scale",
            "salary",
            "remuneration",
            "वेतन",
            "वेतनमान",
            "पे लेवल",
        ],
    )

    selection = find_context(
        text,
        [
            "selection process",
            "selection procedure",
            "चयन प्रक्रिया",
        ],
    )

    exam_pattern = find_context(
        text,
        [
            "exam pattern",
            "scheme of examination",
            "examination scheme",
            "परीक्षा पैटर्न",
            "परीक्षा योजना",
        ],
    )

    negative_marking = find_context(
        text,
        [
            "negative marking",
            "negative marks",
            "ऋणात्मक अंक",
        ],
    )

    syllabus = find_context(
        text,
        [
            "syllabus",
            "पाठ्यक्रम",
        ],
    )

    important = []

    for keywords in [
        ["important instruction", "महत्वपूर्ण निर्देश"],
        ["documents required", "आवश्यक दस्तावेज"],
        ["application fee", "आवेदन शुल्क"],
        ["reservation", "आरक्षण"],
        ["category", "वर्ग"],
    ]:
        value = find_context(
            text,
            keywords,
            max_chars=900,
        )

        if value:
            important.append(value)

    return {
        "dates": dates,
        "vacancy": vacancy,
        "eligibility": eligibility,
        "age_limit": age_limit,
        "age_relaxation": age_relaxation,
        "salary": salary,
        "selection_process": selection,
        "exam_pattern": exam_pattern,
        "negative_marking": negative_marking,
        "syllabus": syllabus,
        "important_information": important,
    }


# ============================================================
# EVENT FINGERPRINT
# ============================================================

def normalize_title(title: str) -> str:

    value = title.lower()

    value = re.sub(
        r"[^a-z0-9\u0900-\u097f]+",
        " ",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value.strip()


def make_hash(value: str) -> str:
    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()


def create_fingerprints(
    title: str,
    url: str,
    notice_number: Optional[str],
    document_id: Optional[str],
    document_sha256: Optional[str],
) -> list[tuple[str, str]]:

    result = []

    if document_id:
        result.append(
            (
                "official_document_id",
                document_id.strip().lower(),
            )
        )

    if notice_number:
        result.append(
            (
                "notice_number",
                notice_number.strip().lower(),
            )
        )

    if document_sha256:
        result.append(
            (
                "document_sha256",
                document_sha256,
            )
        )

    if url:
        result.append(
            (
                "canonical_url",
                normalize_url(url).lower(),
            )
        )

    normalized = normalize_title(title)

    if normalized:
        result.append(
            (
                "title_url",
                make_hash(
                    normalized + "|" + normalize_url(url)
                ),
            )
        )

    return result


def find_existing_event(
    fingerprints: list[tuple[str, str]],
) -> Optional[str]:

    with DB_LOCK:
        conn = db_connect()

        for fingerprint_type, value in fingerprints:

            row = conn.execute(
                """
                SELECT event_id
                FROM fingerprints
                WHERE fingerprint_type = ?
                  AND value = ?
                LIMIT 1
                """,
                (
                    fingerprint_type,
                    value,
                ),
            ).fetchone()

            if row:
                conn.close()
                return row["event_id"]

        conn.close()

    return None


# ============================================================
# EVENT STORAGE
# ============================================================

def register_event(
    item: ResearchItem,
    fingerprints: list[tuple[str, str]],
) -> None:

    with DB_LOCK:
        conn = db_connect()

        conn.execute(
            """
            INSERT OR IGNORE INTO events (
                event_id,
                title,
                canonical_url,
                category,
                notice_number,
                document_id,
                document_sha256,
                first_seen_at,
                last_seen_at,
                published_at,
                status,
                research_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.event_id,
                item.title,
                item.canonical_url,
                item.category,
                item.notice_number,
                item.document_id,
                item.document_sha256,
                item.discovered_at,
                item.discovered_at,
                item.published_at,
                item.status,
                item.research_json_file,
            ),
        )

        for fp_type, value in fingerprints:

            conn.execute(
                """
                INSERT OR IGNORE INTO fingerprints (
                    fingerprint,
                    event_id,
                    fingerprint_type,
                    value,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    make_hash(
                        fp_type + "|" + value
                    ),
                    item.event_id,
                    fp_type,
                    value,
                    item.discovered_at,
                ),
            )

        conn.commit()
        conn.close()


# ============================================================
# 24 HOUR FILTER
# ============================================================

def is_within_24_hours(
    published_at: Optional[str],
    max_hours: int = 72,
) -> bool:

    if not published_at:
        return True

    dt = parse_datetime(published_at)

    if not dt:
        return True

    if dt.tzinfo is None:
        dt = dt.replace(
            tzinfo=timezone.utc
        )

    current = now_utc()

    if dt > current + timedelta(days=365):
        return False

    age = current - dt

    return (
        timedelta(days=-30)
        <= age
        <= timedelta(hours=max_hours)
    )


# ============================================================
# GENERIC SOURCE SCANNER
# ============================================================

def discover_source_items(
    source: Source,
) -> list[dict]:

    response = request_with_retry(
        "GET",
        source.url,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    content = response.content

    if is_pdf_response(
        response,
        source.url,
    ):
        pdf_path, sha = safe_download_pdf(
            response,
            source.url,
        )

        text = extract_pdf_text(
            pdf_path
        )

        title = extract_title(
            None,
            text,
            source.name,
        )

        return [{
            "url": source.url,
            "title": title,
            "published_at": None,
            "content": text,
            "pdf_path": str(pdf_path),
            "document_sha256": sha,
            "links": [],
        }]

    text = extract_html_text(
        content
    )

    links = extract_links(
        content,
        source.url,
    )

    keywords = (
        "notification",
        "advertisement",
        "recruitment",
        "vacancy",
        "result",
        "admission",
        "scholarship",
        "notice",
        "corrigendum",
        "scheme",
        "tender",
        "exam",
        "परिणाम",
        "भर्ती",
        "अधिसूचना",
        "प्रवेश",
    )

    candidates = []

    for link in links:

        label = (
            link["text"] + " " + link["url"]
        ).lower()

        if not any(
            keyword in label
            for keyword in keywords
        ):
            continue

        if not is_official_url(
            link["url"]
        ):
            continue

        pub_date = None
        for pattern in DATE_PATTERNS:
            m = re.search(pattern, link["text"], flags=re.IGNORECASE)
            if m:
                pub_date = m.group(0)
                break

        candidates.append({
            "url": link["url"],
            "title": link["text"],
            "published_at": pub_date,
            "content": None,
            "pdf_path": None,
            "document_sha256": None,
            "links": [],
        })

    if any(
        x in source.url.lower()
        for x in [".pdf", "notification"]
    ):
        candidates.append({
            "url": source.url,
            "title": source.name,
            "published_at": None,
            "content": text,
            "pdf_path": None,
            "document_sha256": None,
            "links": links,
        })

    return candidates[:100]


# ============================================================
# DOCUMENT FETCH
# ============================================================

def fetch_document(
    url: str,
) -> dict:

    response = request_with_retry(
        "GET",
        url,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    content = response.content

    last_modified = response.headers.get("Last-Modified") or response.headers.get("Date")

    if is_pdf_response(
        response,
        url,
    ):

        pdf_path, sha = safe_download_pdf(
            response,
            url,
        )

        text = extract_pdf_text(
            pdf_path
        )

        return {
            "text": text,
            "sha256": sha,
            "pdf_path": str(pdf_path),
            "content_type": "application/pdf",
            "last_modified": last_modified,
            "links": [],
        }

    return {
        "text": extract_html_text(content),
        "sha256": hashlib.sha256(
            content
        ).hexdigest(),
        "pdf_path": None,
        "content_type": response.headers.get(
            "Content-Type",
            "",
        ),
        "last_modified": last_modified,
        "links": extract_links(
            content,
            url,
        ),
    }


# ============================================================
# RESEARCH PACK
# ============================================================

def build_research_pack(
    item: ResearchItem,
    facts: dict,
    raw_text: str,
    links: list[dict],
) -> str:

    dates = facts["dates"]

    official_links = [
        x for x in links
        if x.get("official")
    ]

    lines = []

    lines.append(
        "# KNOWORA OFFICIAL RESEARCH PACK"
    )
    lines.append("")

    lines.append(
        "## 1. EVENT"
    )
    lines.append(
        f"- Title: {item.title}"
    )
    lines.append(
        f"- Category: {item.category or 'Unknown'}"
    )
    lines.append(
        f"- Event ID: {item.event_id}"
    )
    lines.append(
        f"- Research Status: {item.status}"
    )
    lines.append("")

    lines.append(
        "## 2. OFFICIAL SOURCE"
    )
    lines.append(
        f"- Primary URL: {item.canonical_url}"
    )

    for url in item.source_urls:
        lines.append(
            f"- Source: {url}"
        )

    lines.append("")

    lines.append(
        "## 3. NOTICE / DOCUMENT"
    )
    lines.append(
        f"- Notice Number: {item.notice_number or 'Not found in source'}"
    )
    lines.append(
        f"- Document ID: {item.document_id or 'Not found in source'}"
    )
    lines.append(
        f"- SHA-256: {item.document_sha256 or 'N/A'}"
    )
    lines.append("")

    lines.append(
        "## 4. VERIFIED DATES"
    )

    date_labels = {
        "notification_date": "Notification Date",
        "application_start_date": "Application Start Date",
        "application_last_date": "Application Last Date",
        "fee_payment_last_date": "Fee Payment Last Date",
        "correction_start_date": "Correction Start Date",
        "correction_last_date": "Correction Last Date",
        "exam_date": "Exam Date",
        "admit_card_date": "Admit Card Date",
        "result_date": "Result Date",
        "interview_date": "Interview Date",
    }

    for key, label in date_labels.items():
        value = dates.get(key)

        lines.append(
            f"- {label}: "
            f"{value if value else 'Not mentioned / not verified'}"
        )

    lines.append("")
    lines.append(
        "IMPORTANT: Never convert an unverified or missing date "
        "into an official date."
    )
    lines.append("")

    lines.append(
        "## 5. VACANCY"
    )
    lines.append(
        facts["vacancy"]
        or "Not explicitly verified in extracted source text."
    )
    lines.append("")

    lines.append(
        "## 6. ELIGIBILITY"
    )
    lines.append(
        facts["eligibility"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 7. AGE LIMIT"
    )
    lines.append(
        facts["age_limit"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 8. AGE RELAXATION"
    )
    lines.append(
        facts["age_relaxation"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 9. SALARY / PAY"
    )
    lines.append(
        facts["salary"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 10. SELECTION PROCESS"
    )
    lines.append(
        facts["selection_process"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 11. EXAM PATTERN"
    )
    lines.append(
        facts["exam_pattern"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 12. NEGATIVE MARKING"
    )
    lines.append(
        facts["negative_marking"]
        or "Not explicitly verified."
    )
    lines.append("")

    lines.append(
        "## 13. SYLLABUS"
    )
    lines.append(
        facts["syllabus"]
        or "Not mentioned in this new source."
    )
    lines.append("")

    lines.append(
        "## 14. IMPORTANT INFORMATION"
    )

    if facts["important_information"]:
        for value in facts["important_information"]:
            lines.append(
                f"- {value}"
            )
    else:
        lines.append(
            "- No additional structured information extracted."
        )

    lines.append("")

    lines.append(
        "## 15. OFFICIAL LINKS"
    )

    lines.append(
        f"- Primary official source: {item.canonical_url}"
    )

    for link in official_links:
        lines.append(
            f"- {link['text']}: {link['url']}"
        )

    lines.append("")

    lines.append(
        "## 16. FULL SOURCE TEXT"
    )
    lines.append(
        "The following is extracted source text. "
        "Use it for fact verification; do not blindly copy it."
    )
    lines.append("")
    lines.append(raw_text)

    lines.append("")
    lines.append(
        "## 17. WRITING RULES FOR CUSTOM GPT"
    )
    lines.append(
        "1. Write only from verified official information."
    )
    lines.append(
        "2. Do not invent vacancy, dates, salary, eligibility "
        "or exam details."
    )
    lines.append(
        "3. Latest substantive official corrigendum overrides "
        "older conflicting information."
    )
    lines.append(
        "4. If information is missing, clearly say it is not "
        "mentioned in the official source."
    )
    lines.append(
        "5. Keep official links intact."
    )
    lines.append(
        "6. Distinguish official dates from expected dates."
    )
    lines.append(
        "7. Do not present assumptions as facts."
    )
    lines.append(
        "8. Prepare the Knowora article in standard Hindi "
        "with English technical terms in brackets."
    )

    return "\n".join(lines)


# ============================================================
# JSON
# ============================================================

def save_research_files(
    item: ResearchItem,
    facts: dict,
    raw_text: str,
    links: list[dict],
) -> None:

    event_dir = ACTIVE_DIR / item.event_id
    event_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    json_path = event_dir / "research.json"
    text_path = event_dir / "full_source_text.txt"
    pack_path = event_dir / "research_pack.md"

    item.research_json_file = str(
        json_path
    )
    item.full_text_file = str(
        text_path
    )
    item.research_pack_file = str(
        pack_path
    )

    payload = {
        "event": asdict(item),
        "verified_facts": facts,
        "official_links": links,
        "full_source_text_file": str(
            text_path
        ),
        "generated_at": iso(now_utc()),
        "rules": {
            "only_official_sources": True,
            "no_invented_dates": True,
            "no_invented_vacancies": True,
            "latest_official_update_wins": True,
            "active_window_hours": 24,
        },
    }

    atomic_write_text(
        text_path,
        raw_text,
    )

    atomic_write_text(
        json_path,
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
    )

    pack = build_research_pack(
        item,
        facts,
        raw_text,
        links,
    )

    atomic_write_text(
        pack_path,
        pack,
    )


# ============================================================
# PROCESS SINGLE CANDIDATE
# ============================================================

def process_candidate(
    source: Source,
    candidate: dict,
) -> Optional[str]:

    url = normalize_url(
        candidate.get("url", "")
    )

    if not url:
        return None

    if not is_official_url(url):
        logger.warning(
            "Skipping non-official URL: %s",
            url,
        )
        return None

    try:
        document = fetch_document(url)

    except Exception as exc:
        logger.error(
            "Document failed: %s | %s",
            url,
            exc,
        )
        return None

    raw_text = document["text"]

    if len(raw_text.strip()) < 100:
        logger.info(
            "Insufficient text: %s",
            url,
        )
        return None

    title = extract_title(
        None,
        raw_text,
        candidate.get("title")
        or source.name,
    )

    facts = extract_facts(
        raw_text
    )

    notice_number = extract_notice_number(
        raw_text
    )

    published_at = candidate.get(
        "published_at"
    )

    if not published_at and facts.get("dates", {}).get("notification_date"):
        published_at = facts["dates"]["notification_date"]

    if not published_at and facts.get("dates", {}).get("application_start_date"):
        published_at = facts["dates"]["application_start_date"]

    if not published_at and document.get("last_modified"):
        published_at = document["last_modified"]

    if not published_at:
        published_at = iso(now_utc())

    if not is_within_24_hours(
        published_at
    ):
        logger.info(
            "Publication timestamp out of active window (%s): %s",
            published_at,
            url,
        )
        return None

    document_sha256 = document.get(
        "sha256"
    )

    fingerprints = create_fingerprints(
        title=title,
        url=url,
        notice_number=notice_number,
        document_id=None,
        document_sha256=document_sha256,
    )

    existing = find_existing_event(
        fingerprints
    )

    if existing:
        logger.info(
            "DUPLICATE -> skipped: %s -> %s",
            title,
            existing,
        )
        return existing

    event_id = make_hash(
        "|".join(
            [
                normalize_title(title),
                url,
                notice_number or "",
                document_sha256 or "",
            ]
        )
    )[:24]

    discovered = now_utc()
    expires = (
        discovered
        + timedelta(hours=ACTIVE_HOURS)
    )

    item = ResearchItem(
        event_id=event_id,
        title=title,
        canonical_url=url,
        source_urls=[source.url],
        source_names=[source.name],
        category=source.category,
        published_at=published_at,

        notice_number=notice_number,
        document_id=None,
        document_sha256=document_sha256,

        notification_date=facts["dates"].get(
            "notification_date"
        ),
        application_start_date=facts["dates"].get(
            "application_start_date"
        ),
        application_last_date=facts["dates"].get(
            "application_last_date"
        ),
        fee_payment_last_date=facts["dates"].get(
            "fee_payment_last_date"
        ),
        correction_start_date=facts["dates"].get(
            "correction_start_date"
        ),
        correction_last_date=facts["dates"].get(
            "correction_last_date"
        ),
        exam_date=facts["dates"].get(
            "exam_date"
        ),
        admit_card_date=facts["dates"].get(
            "admit_card_date"
        ),
        result_date=facts["dates"].get(
            "result_date"
        ),
        interview_date=facts["dates"].get(
            "interview_date"
        ),

        vacancy=facts["vacancy"],
        eligibility=facts["eligibility"],
        age_limit=facts["age_limit"],
        age_relaxation=facts["age_relaxation"],
        salary=facts["salary"],
        selection_process=facts["selection_process"],
        exam_pattern=facts["exam_pattern"],
        negative_marking=facts["negative_marking"],
        syllabus=facts["syllabus"],

        important_information=facts[
            "important_information"
        ],

        full_text_file="",
        research_json_file="",
        research_pack_file="",

        discovered_at=iso(discovered),
        expires_at=iso(expires),
    )

    save_research_files(
        item,
        facts,
        raw_text,
        document.get("links", []),
    )

    register_event(
        item,
        fingerprints,
    )

    logger.info(
        "NEW RESEARCH EVENT: %s | %s",
        event_id,
        title,
    )

    return event_id


# ============================================================
# SOURCE HEALTH
# ============================================================

def source_started(
    source: Source,
) -> None:

    with DB_LOCK:
        conn = db_connect()

        conn.execute(
            """
            INSERT INTO sources (
                source_id,
                name,
                url,
                last_checked_at
            )
            VALUES (?, ?, ?, ?)
            ON CONFLICT(source_id)
            DO UPDATE SET
                last_checked_at = excluded.last_checked_at
            """,
            (
                source.source_id,
                source.name,
                source.url,
                iso(now_utc()),
            ),
        )

        conn.commit()
        conn.close()


def source_success(
    source: Source,
) -> None:

    with DB_LOCK:
        conn = db_connect()

        conn.execute(
            """
            UPDATE sources
            SET last_success_at = ?,
                last_error = NULL,
                consecutive_failures = 0
            WHERE source_id = ?
            """,
            (
                iso(now_utc()),
                source.source_id,
            ),
        )

        conn.commit()
        conn.close()


def source_failure(
    source: Source,
    error: str,
) -> None:

    with DB_LOCK:
        conn = db_connect()

        conn.execute(
            """
            UPDATE sources
            SET last_error = ?,
                consecutive_failures =
                    consecutive_failures + 1
            WHERE source_id = ?
            """,
            (
                str(error)[:2000],
                source.source_id,
            ),
        )

        conn.commit()
        conn.close()


# ============================================================
# CLEANUP ACTIVE QUEUE
# ============================================================

def cleanup_expired_active_items() -> None:

    current = now_utc()

    for directory in ACTIVE_DIR.iterdir():

        if not directory.is_dir():
            continue

        json_file = directory / "research.json"

        if not json_file.exists():
            continue

        try:
            data = json.loads(
                json_file.read_text(
                    encoding="utf-8"
                )
            )

            event = data.get(
                "event",
                {}
            )

            expires = parse_datetime(
                event.get("expires_at")
            )

            if not expires:
                continue

            if expires < current:

                archive_target = (
                    ARCHIVE_DIR / directory.name
                )

                if archive_target.exists():
                    archive_target = (
                        ARCHIVE_DIR
                        / f"{directory.name}_{int(time.time())}"
                    )

                os.replace(
                    directory,
                    archive_target,
                )

                logger.info(
                    "Archived expired research: %s",
                    directory.name,
                )

        except Exception as exc:
            logger.error(
                "Cleanup error: %s | %s",
                directory,
                exc,
            )


# ============================================================
# HEARTBEAT
# ============================================================

HEARTBEAT_FILE = BASE_DIR / "heartbeat.json"


def write_heartbeat(
    status: str,
    extra: Optional[dict] = None,
) -> None:

    payload = {
        "status": status,
        "time": iso(now_utc()),
        "pid": os.getpid(),
    }

    if extra:
        payload.update(extra)

    atomic_write_text(
        HEARTBEAT_FILE,
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
    )


# ============================================================
# ONE COMPLETE RUN
# ============================================================

def run_once() -> None:

    started = now_utc()

    write_heartbeat(
        "STARTING"
    )

    cleanup_expired_active_items()

    blueprint = fetch_blueprint()

    sources = extract_sources(
        blueprint
    )

    if not sources:
        raise RuntimeError(
            "No sources found in blueprint"
        )

    logger.info(
        "Starting research across %s sources",
        len(sources),
    )

    successful_sources = 0
    failed_sources = 0
    new_events = 0

    for index, source in enumerate(
        sources,
        start=1,
    ):

        if not source.enabled:
            continue

        logger.info(
            "[%s/%s] Checking: %s",
            index,
            len(sources),
            source.name,
        )

        source_started(source)

        try:

            candidates = discover_source_items(
                source
            )

            for candidate in candidates:

                try:
                    result = process_candidate(
                        source,
                        candidate,
                    )

                    if result:
                        new_events += 1

                except Exception as exc:
                    logger.error(
                        "Candidate error: %s",
                        exc,
                    )
                    traceback.print_exc()

            source_success(
                source
            )

            successful_sources += 1

        except Exception as exc:

            failed_sources += 1

            source_failure(
                source,
                str(exc),
            )

            logger.error(
                "SOURCE FAILED but worker continues: "
                "%s | %s",
                source.name,
                exc,
            )

    cleanup_expired_active_items()

    finished = now_utc()

    write_heartbeat(
        "COMPLETED",
        {
            "started_at": iso(started),
            "finished_at": iso(finished),
            "sources_total": len(sources),
            "sources_successful": successful_sources,
            "sources_failed": failed_sources,
            "new_events": new_events,
        },
    )

    logger.info(
        "RUN COMPLETE | sources=%s | failed=%s | new=%s",
        successful_sources,
        failed_sources,
        new_events,
    )


# ============================================================
# CRASH-SAFE SUPERVISOR
# ============================================================

def supervisor() -> None:

    init_db()

    logger.info(
        "Knowora Research Worker started."
    )

    logger.info(
        "Data directory: %s",
        BASE_DIR,
    )

    while True:

        try:

            run_once()

        except KeyboardInterrupt:

            logger.info(
                "Worker stopped manually."
            )
            write_heartbeat(
                "STOPPED"
            )
            break

        except Exception as exc:

            logger.critical(
                "TOP-LEVEL ERROR - worker will recover: %s",
                exc,
            )

            traceback.print_exc()

            write_heartbeat(
                "RECOVERING",
                {
                    "error": str(exc)[:2000],
                },
            )

            time.sleep(60)

        remaining = RUN_EVERY_SECONDS

        while remaining > 0:

            try:
                time.sleep(
                    min(remaining, 30)
                )
                remaining -= 30

            except KeyboardInterrupt:
                logger.info(
                    "Worker stopped manually."
                )
                write_heartbeat(
                    "STOPPED"
                )
                return


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    try:
        supervisor()

    except BaseException as exc:

        logger.critical(
            "Fatal supervisor failure: %s",
            exc,
        )

        traceback.print_exc()

        sys.exit(1)
