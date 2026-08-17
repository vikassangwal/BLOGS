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

  // Pass incoming GET request as a POST request to the handler to avoid Next.js routing issues
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
  });

  // Run the blog generation in the background so cron-job.org doesn't timeout
  waitUntil(
    POST(postRequest).catch(async (err) => {
      console.error("Background auto-blog error:", err);
      try {
        const { prisma } = await import('@/lib/prisma');
        await prisma.autoBlogLog.create({
          data: {
            keyword: 'Cron Trigger Error',
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
