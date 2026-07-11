import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkGoogleIndexingStatus, submitToGoogleIndexing } from '@/lib/google-indexing';

export const maxDuration = 60; // 60 seconds maximum duration

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    const isCronCall = expectedSecret && (
      request.headers.get('x-cron-secret') === expectedSecret || 
      authHeader === `Bearer ${expectedSecret}` ||
      new URL(request.url).searchParams.get('secret') === expectedSecret
    );
    
    if (!isCronCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch site settings and API keys to get GSC credentials
    const [siteSettings, settings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } })
    ]);

    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    const googleIndexingJson = savedKeys.googleIndexingJson;
    const telegramToken = savedKeys.telegramToken || settings?.telegramToken;
    const telegramChatId = savedKeys.telegramChatId || settings?.telegramChatId;

    if (!googleIndexingJson) {
      return NextResponse.json({ error: 'Google Indexing Credentials not configured.' }, { status: 400 });
    }

    // Fetch the 5 most recently published blog posts (published in the last 14 days)
    // to check their live indexing status on Google.
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        publishedAt: {
          gte: fourteenDaysAgo
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 5
    });

    if (posts.length === 0) {
      return NextResponse.json({ success: true, message: 'No published posts in the last 14 days to check.' });
    }

    const results: string[] = [];
    for (const post of posts) {
      const url = `https://knowora.in/blog/${post.slug}`;
      
      // 1. Inspect URL status
      const checkRes = await checkGoogleIndexingStatus(url, 'https://www.knowora.in/', googleIndexingJson);
      
      if (checkRes.success) {
        if (checkRes.isIndexed) {
          results.push(`✅ <b>Indexed</b>: <a href="${url}">${post.title.substring(0, 30)}...</a>`);
        } else {
          // 2. Re-submit if NOT indexed
          const submitRes = await submitToGoogleIndexing(url, 'URL_UPDATED', googleIndexingJson);
          if (submitRes.success) {
            results.push(`⚠️ <b>Not Indexed (Re-submitted)</b>: <a href="${url}">${post.title.substring(0, 30)}...</a>`);
          } else {
            results.push(`❌ <b>Not Indexed (Submit Fail: ${submitRes.message})</b>: <a href="${url}">${post.title.substring(0, 30)}...</a>`);
          }
        }
      } else {
        results.push(`⚠️ <b>Check Failed (${checkRes.detail})</b>: <a href="${url}">${post.title.substring(0, 30)}...</a>`);
      }
    }

    // Send summary to Telegram if configured
    if (telegramToken && telegramChatId && results.length > 0) {
      const summaryText = `🔍 <b>Google Indexing Weekly Report</b>\n\n` + results.join('\n') + `\n\n<i>Next check in 7 days.</i>`;
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: summaryText,
          parse_mode: 'HTML'
        })
      }).catch(e => console.error('Telegram indexing report failed:', e));
    }

    return NextResponse.json({
      success: true,
      checkedCount: posts.length,
      results
    });

  } catch (error: any) {
    console.error('[CRON Indexing Check Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
