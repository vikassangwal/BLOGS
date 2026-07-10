import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../auto-blog/route';
import { waitUntil } from '@vercel/functions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s limit for Hobby

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || '';
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== cronSecret && !request.headers.get('authorization')?.includes(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run the blog generation in the background so cron-job.org doesn't timeout
  waitUntil(
    POST(request).catch((err) => console.error("Background auto-blog error:", err))
  );

  // Immediately return a success response to the cron job service
  return NextResponse.json({ status: 'Processing in background (up to 60s)' }, { status: 202 });
}
