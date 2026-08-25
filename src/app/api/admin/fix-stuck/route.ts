import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Find all keywords in intermediate statuses
    const stuckKeywords = await prisma.autoBlogKeyword.findMany({
      where: {
        status: { in: ['research_completed', 'writing_completed', 'researching', 'writing'] }
      }
    });

    let fixed = 0;
    const results: any[] = [];

    for (const kw of stuckKeywords) {
      if (kw.postId) {
        // Check if the linked post actually exists in database
        const post = await prisma.blogPost.findUnique({ where: { id: kw.postId }, select: { id: true, status: true } });
        if (!post) {
          // Post was deleted — reset keyword to pending so it restarts fresh
          await prisma.autoBlogKeyword.update({
            where: { id: kw.id },
            data: { status: 'pending', postId: null }
          });
          fixed++;
          results.push({ keyword: kw.keyword, action: 'Reset to pending (orphaned post)' });
        }
      } else {
        // No postId but stuck in intermediate status — reset
        await prisma.autoBlogKeyword.update({
          where: { id: kw.id },
          data: { status: 'pending' }
        });
        fixed++;
        results.push({ keyword: kw.keyword, action: 'Reset to pending (no postId)' });
      }
    }

    // 2. Also reset any failed keywords so they get retried
    const failedReset = await prisma.autoBlogKeyword.updateMany({
      where: { status: 'failed' },
      data: { status: 'pending', postId: null }
    });

    return NextResponse.json({
      success: true,
      message: `${fixed} अटके हुए keywords ठीक कर दिए गए हैं! ${failedReset.count} failed keywords को भी reset कर दिया गया है।`,
      fixedOrphans: fixed,
      failedReset: failedReset.count,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
