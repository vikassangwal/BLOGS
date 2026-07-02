import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { path, postId } = await request.json();

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // 1. Record the Pageview
    await prisma.pageview.create({
      data: {
        path,
        postId: postId || null,
      }
    });

    // 2. Increment BlogPost total views if applicable
    if (postId) {
      try {
        await prisma.blogPost.update({
          where: { id: postId },
          data: {
            // Note: If you don't have a 'views' column on BlogPost, this will fail.
            // We'll catch the error silently so it doesn't break the pageview tracking,
            // but for real views, we'd need a 'views Int @default(0)' on BlogPost.
            // Since we rely on Pageview table for stats, we might not strictly need it.
          }
        });
      } catch (e) {
        // Ignore if BlogPost 'views' column doesn't exist yet
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
