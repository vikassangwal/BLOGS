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

    // 1. Direct UPSC XML Feed (with browser headers)
    try {
      const upscRes = await fetch('https://www.upsc.gov.in/feed/whatsnew.xml', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        next: { revalidate: 300 }
      });
      if (upscRes.ok) {
        const text = await upscRes.text();
        const parsed = parseRssFeed(text, 'UPSC Official Direct');
        alerts.push(...parsed.slice(0, 10));
      }
    } catch (e) {
      console.error('UPSC RSS Direct Fetch failed:', e);
    }

    // 2. Define multiple separate queries to Google News search RSS
    const feeds = [
      {
        name: 'UPSC Search',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+site:upsc.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 8
      },
      {
        name: 'SSC Official',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+site:ssc.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 8
      },
      {
        name: 'Employment News',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+site:employmentnews.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 8
      },
      {
        name: 'Bank Jobs (IBPS/SBI)',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+(site:ibps.in+OR+site:sbi.co.in)&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      },
      {
        name: 'Railways (RRB)',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+site:rrcb.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      },
      {
        name: 'Defense (Army/Navy/AirForce)',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+(site:drdo.gov.in+OR+site:joinindianarmy.nic.in+OR+site:indianairforce.nic.in+OR+site:joinindiannavy.gov.in)&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      },
      {
        name: 'PIB Press Releases',
        url: 'https://news.google.com/rss/search?q=recruitment+OR+vacancy+site:pib.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 8
      },
      {
        name: 'E-Gazette India',
        url: 'https://news.google.com/rss/search?q=notification+OR+recruitment+OR+vacancy+site:egazette.gov.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 8
      },
      {
        name: 'Board Exams (CBSE/ICSE)',
        url: 'https://news.google.com/rss/search?q=exam+OR+date+sheet+OR+admit+card+OR+result+(site:cbse.gov.in+OR+site:cisce.org)&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      },
      {
        name: 'University Updates (DU/IGNOU)',
        url: 'https://news.google.com/rss/search?q=admission+OR+results+OR+exam+form+OR+datesheet+(site:du.ac.in+OR+site:ignou.ac.in)&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      },
      {
        name: 'Admissions & Entrance (NTA)',
        url: 'https://news.google.com/rss/search?q=counselling+OR+admissions+OR+results+OR+admit+card+site:nta.ac.in&hl=en-IN&gl=IN&ceid=IN:en',
        limit: 6
      }
    ];

    // Fetch all Google News queries in parallel
    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 300 }
          });
          if (res.ok) {
            const xml = await res.text();
            return parseRssFeed(xml, feed.name).slice(0, feed.limit);
          }
        } catch (e) {
          console.error(`Fetch failed for ${feed.name}:`, e);
        }
        return [];
      })
    );

    // Merge all batches
    for (const batch of results) {
      alerts.push(...batch);
    }

    // Sort or filter if needed, de-duplicate by URL or title prefix
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
