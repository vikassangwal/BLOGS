import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Find all keywords in research_completed or writing_completed
    const stuckKeywords = await prisma.autoBlogKeyword.findMany({
      where: {
        status: { in: ['research_completed', 'writing_completed'] }
      }
    });

    let fixedCount = 0;
    const details: any[] = [];

    for (const kw of stuckKeywords) {
      if (!kw.postId) {
        await prisma.autoBlogKeyword.update({
          where: { id: kw.id },
          data: { status: 'pending', postId: null }
        });
        fixedCount++;
        details.push({ keyword: kw.keyword, action: 'Reset to pending (no postId)' });
      } else {
        const post = await prisma.blogPost.findUnique({ where: { id: kw.postId }, select: { id: true, status: true } });
        if (!post) {
          await prisma.autoBlogKeyword.update({
            where: { id: kw.id },
            data: { status: 'pending', postId: null }
          });
          fixedCount++;
          details.push({ keyword: kw.keyword, action: 'Reset to pending (draft deleted)' });
        }
      }
    }

    // 2. Reset any failed keywords
    const failedReset = await prisma.autoBlogKeyword.updateMany({
      where: { status: 'failed' },
      data: { status: 'pending', postId: null }
    });

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${fixedCount} अटके हुए कीवर्ड्स को रीसेट कर दिया गया है!`,
      fixedOrphans: fixedCount,
      failedReset: failedReset.count,
      details
    });
  } catch (error: any) {
    console.error('Error in fix-stuck:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
