import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ScrapedAlert {
  title: string;
  sourceUrl: string;
  pubDate: string;
  source: string;
}

function parseRssFeed(xmlText: string, sourceName: string): ScrapedAlert[] {
  const items: ScrapedAlert[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
  
  for (const item of itemMatches) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    
    let title = titleMatch ? titleMatch[1] : '';
    let link = linkMatch ? linkMatch[1] : '';
    let pubDate = pubDateMatch ? pubDateMatch[1] : '';
    
    // Clean up CDATA if present
    title = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    link = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    pubDate = pubDate.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    
    // Decode HTML entities
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    
    if (title && link) {
      items.push({
        title,
        sourceUrl: link,
        pubDate: pubDate ? new Date(pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
        source: sourceName
      });
    }
  }
  
  return items;
}

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts: ScrapedAlert[] = [];

    // UPSC XML Feed
    try {
      const upscRes = await fetch('https://www.upsc.gov.in/feed/whatsnew.xml', { next: { revalidate: 300 } });
      if (upscRes.ok) {
        const text = await upscRes.text();
        const parsed = parseRssFeed(text, 'UPSC Official');
        alerts.push(...parsed.slice(0, 10));
      }
    } catch (e) {
      console.error('UPSC RSS Fetch failed:', e);
    }

    // Google News - PIB / Employment News recruitment feed
    try {
      const gNewsUrl = `https://news.google.com/rss/search?q=recruitment+vacancy+(site:pib.gov.in+OR+site:employmentnews.gov.in+OR+upsc+OR+ssc)&hl=en-IN&gl=IN&ceid=IN:en`;
      const gNewsRes = await fetch(gNewsUrl, { next: { revalidate: 300 } });
      if (gNewsRes.ok) {
        const text = await gNewsRes.text();
        const parsed = parseRssFeed(text, 'PIB / Employment News');
        alerts.push(...parsed.slice(0, 25));
      }
    } catch (e) {
      console.error('Google News RSS Fetch failed:', e);
    }

    // Sort or filter if needed, de-duplicate by URL
    const uniqueAlerts: ScrapedAlert[] = [];
    const seenUrls = new Set<string>();

    for (const alert of alerts) {
      // Clean redirect urls or extract from Google News if possible
      const cleanUrl = alert.sourceUrl.split('?')[0];
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        uniqueAlerts.push(alert);
      }
    }

    return NextResponse.json({
      success: true,
      alerts: uniqueAlerts
    });

  } catch (error: any) {
    console.error('Sourcing Feed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
