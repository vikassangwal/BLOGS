import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Delete messy / duplicate test slugs
    const badSlugs = [
      '2026',
      '31-2026',
      '2026-3580',
      'india-post-gds-recruitment-2026-10',
      'ibps-clerk-recruitment-2026-crp-csa-xvi-31-2026-27',
      'ibps-clerk-recruitment-2026-crp-csa-xvi-exam-dates-syllabus'
    ];

    const deleted = await prisma.blogPost.deleteMany({
      where: {
        slug: { in: badSlugs }
      }
    });

    // 2. Clean all existing posts from citation codes (citeturn...) and markdown artifacts
    const allPosts = await prisma.blogPost.findMany();
    let cleanedCount = 0;

    for (const post of allPosts) {
      let content = post.content || '';
      let hasChange = false;

      // Clean citation tags
      if (/citeturn\d+search\d+/i.test(content) || /turn\d+search\d+/i.test(content)) {
        content = content
          .replace(/citeturn\d+search\d+/gi, '')
          .replace(/turn\d+search\d+/gi, '')
          .replace(/\[citation needed\]/gi, '')
          .replace(/\[\d+\]/g, '');
        hasChange = true;
      }

      if (hasChange) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { content }
        });
        cleanedCount++;
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    const remainingCount = await prisma.blogPost.count({ where: { status: 'Published' } });

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${deleted.count} खराब/डुप्लीकेट पोस्ट्स हटाई गईं और ${cleanedCount} पोस्ट्स का कंटेंट साफ़ किया गया!`,
      deleted: deleted.count,
      cleaned: cleanedCount,
      totalLivePosts: remainingCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
