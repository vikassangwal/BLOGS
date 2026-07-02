import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This API route is triggered by Vercel Cron
// It deletes blog posts that are older than 1 year (365 days)
export async function GET(request: Request) {
  try {
    // Optional: Protect cron route from unauthorized access (Vercel sets a specific header)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const deletedPosts = await prisma.blogPost.deleteMany({
      where: {
        createdAt: {
          lt: oneYearAgo
        }
      }
    });

    console.log(`[CRON] Cleaned up ${deletedPosts.count} posts older than 1 year.`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedPosts.count} old posts.`,
      deletedCount: deletedPosts.count
    });

  } catch (error: any) {
    console.error('[CRON Cleanup Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
