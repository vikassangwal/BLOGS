import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. GET COMMENTS
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Fetch site settings to check if comments are enabled
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (siteSettings && !siteSettings.commentsEnabled) {
      return NextResponse.json({ success: false, error: 'Comments are disabled site-wide' }, { status: 403 });
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { postId: post.id, approved: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST COMMENT
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Fetch site settings to check if comments are enabled
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (siteSettings && !siteSettings.commentsEnabled) {
      return NextResponse.json({ success: false, error: 'Comments are disabled site-wide' }, { status: 403 });
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const { author, content } = body;

    if (!author || !author.trim() || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Author name and comment content are required.' }, { status: 400 });
    }

    const newComment = await prisma.comment.create({
      data: {
        postId: post.id,
        author: author.trim().substring(0, 50),
        content: content.trim().substring(0, 500),
        approved: true // Auto-approve by default for simplicity, can be changed later
      }
    });

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error: any) {
    console.error('Post comment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
