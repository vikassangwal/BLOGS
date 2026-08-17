import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../auto-blog/route';
import { waitUntil } from '@vercel/functions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s limit for Hobby

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
  const secret = request.nextUrl.searchParams.get('secret');
  const authHeader = request.headers.get('authorization') || '';
  if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}` && secret !== 'knowora-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prisma } = await import('@/lib/prisma');
  
  let targetStep = 'stage1';
  let targetPostId = '';

  // 1. Check if there's a post ready for SEO & Publishing (Stage 3)
  const stage3Keyword = await prisma.autoBlogKeyword.findFirst({
    where: { status: 'writing_completed' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  });
  
  if (stage3Keyword) {
    targetStep = 'stage3';
    targetPostId = stage3Keyword.postId || '';
  } else {
    // 2. Check if there's a post ready for Writing (Stage 2)
    const stage2Keyword = await prisma.autoBlogKeyword.findFirst({
      where: { status: 'research_completed' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    });
    if (stage2Keyword) {
      targetStep = 'stage2';
      targetPostId = stage2Keyword.postId || '';
    }
  }

  const urlObj = new URL(request.url);
  urlObj.searchParams.set('step', targetStep);
  if (targetPostId) {
    urlObj.searchParams.set('postId', targetPostId);
  }

  // Pass incoming GET request as a POST request to the handler to avoid Next.js routing issues
  const postRequest = new NextRequest(urlObj.toString(), {
    method: 'POST',
    headers: request.headers,
  });

  // Run the blog generation in the background so cron-job.org doesn't timeout
  waitUntil(
    POST(postRequest).catch(async (err) => {
      console.error(`Background auto-blog error (${targetStep}):`, err);
      try {
        await prisma.autoBlogLog.create({
          data: {
            keyword: `Cron Trigger Error (${targetStep})`,
            status: 'failed',
            error: err.message || 'Unknown error in cron background execution'
          }
        });
      } catch (e) {}
    })
  );

  // Immediately return a success response to the cron job service
  return NextResponse.json({ status: 'Processing in background (up to 60s)' }, { status: 202 });
}
