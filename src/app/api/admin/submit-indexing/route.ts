import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { submitToGoogleIndexing } from '@/lib/google-indexing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch site settings and API keys to get GSC credentials
    const [siteSettings, autoBlogSettings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } })
    ]);

    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    const googleIndexingJson = savedKeys.googleIndexingJson || autoBlogSettings?.googleIndexingJson;

    // 1. Ping Google & Bing Sitemaps
    const sitemapUrl = 'https://knowora.in/sitemap.xml';
    const pingResults = await Promise.allSettled([
      fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
      fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
    ]);

    if (!googleIndexingJson) {
      return NextResponse.json({
        success: true,
        message: 'Google Indexing JSON is not set in Admin Settings. Sitemaps were pinged to Google & Bing.',
        sitemapPinged: true,
        hasIndexingKey: false,
        note: 'Please paste your Google Service Account JSON in Admin > Settings > Google Indexing API for 10-minute auto-indexing.'
      });
    }

    // 2. Fetch latest published posts to submit
    const posts = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, slug: true, publishedAt: true }
    });

    const results: any[] = [];
    for (const post of posts) {
      // Try both www and non-www to match whatever property is in Google Search Console
      const urlNonWww = `https://knowora.in/blog/${post.slug}`;
      const urlWww = `https://www.knowora.in/blog/${post.slug}`;

      let res = await submitToGoogleIndexing(urlNonWww, 'URL_UPDATED', googleIndexingJson);
      let usedUrl = urlNonWww;

      if (!res.success && res.message?.includes('403')) {
        // Fallback to www URL which matches the Search Console property
        const resWww = await submitToGoogleIndexing(urlWww, 'URL_UPDATED', googleIndexingJson);
        if (resWww.success) {
          res = resWww;
          usedUrl = urlWww;
        }
      }

      results.push({
        title: post.title.slice(0, 50),
        url: usedUrl,
        status: res.success ? '✅ Google Indexing Notified' : `❌ Failed: ${res.message}`
      });
    }

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${results.filter(r => r.status.includes('✅')).length} ब्लॉग्स को गूगल इंडेक्सिंग API में सबमिट कर दिया गया है!`,
      submittedCount: results.length,
      hasIndexingKey: true,
      sitemapPinged: true,
      results
    });

  } catch (error: any) {
    console.error('Error in submit-indexing route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
