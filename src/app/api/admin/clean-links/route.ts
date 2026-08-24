import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAndFixLinks, stripLinkDisclaimers } from '@/lib/link-validator';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      select: { id: true, title: true, content: true, slug: true }
    });

    let cleanedCount = 0;
    const results: any[] = [];

    for (const post of posts) {
      if (!post.content) continue;

      const original = post.content;
      const stripped = stripLinkDisclaimers(original);
      const fixed = validateAndFixLinks(stripped, post.title);

      if (fixed !== original) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            content: fixed,
            updatedAt: new Date()
          }
        });
        cleanedCount++;
        try {
          revalidatePath(`/blog/${post.slug}`);
        } catch(e) {}
        results.push({
          id: post.id,
          title: post.title.slice(0, 60),
          slug: post.slug,
          status: 'Cleaned & Real Links Applied'
        });
      }
    }

    try {
      revalidatePath('/blog');
      revalidatePath('/');
    } catch(e) {}

    return NextResponse.json({
      success: true,
      message: `${cleanedCount} ब्लॉग्स से सभी फेक डिस्क्लेमर्स हटाकर असली लिंक्स लगा दिए गए हैं!`,
      totalPosts: posts.length,
      cleanedCount,
      results
    });
  } catch (err: any) {
    console.error('Error cleaning links:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
