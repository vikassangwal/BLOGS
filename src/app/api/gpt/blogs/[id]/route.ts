import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SECRET_KEY = 'knowora-secret-2026';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ai-secret',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function verifyAuth(request: NextRequest, bodySecret?: string): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-ai-secret') || '';
  const querySecret = request.nextUrl.searchParams.get('secret') || '';
  return (
    querySecret === SECRET_KEY ||
    headerSecret === SECRET_KEY ||
    authHeader === `Bearer ${SECRET_KEY}` ||
    bodySecret === SECRET_KEY
  );
}

// GET: Read full blog post details & HTML content
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id }
        ]
      },
      include: {
        tags: { include: { tag: true } },
        author: { select: { name: true } }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404, headers: CORS_HEADERS });
    }

    const plainText = (post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).length;

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        wordCount,
        liveUrl: `https://www.knowora.in/blog/${post.slug}`
      }
    }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

// PUT: Edit / Update blog post content, title, SEO, category, status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    if (!verifyAuth(request, body.secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { OR: [{ id }, { slug: id }] }
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404, headers: CORS_HEADERS });
    }

    const updateData: any = {};
    if (body.title) updateData.title = body.title.trim();
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.content) updateData.content = body.content;
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt;
    if (body.gridBox) updateData.gridBox = body.gridBox;
    if (body.status) updateData.status = body.status;
    if (body.seoTitle) updateData.seoTitle = body.seoTitle;
    if (body.seoDescription) updateData.seoDescription = body.seoDescription;
    if (body.seoKeywords) updateData.seoKeywords = body.seoKeywords;
    if (body.officialApplyUrl) updateData.officialApplyUrl = body.officialApplyUrl;
    if (body.slug) updateData.slug = body.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: updateData
    });

    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath(`/blog/${updated.slug}`);

    return NextResponse.json({
      success: true,
      message: 'Blog post updated successfully',
      post: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        url: `https://www.knowora.in/blog/${updated.slug}`
      }
    }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

// DELETE: Delete blog post by ID or Slug
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let bodySecret = '';
    try {
      const b = await request.json();
      bodySecret = b?.secret;
    } catch(e) {}

    if (!verifyAuth(request, bodySecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { OR: [{ id }, { slug: id }] }
    });

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404, headers: CORS_HEADERS });
    }

    // Delete post tags relations first
    await prisma.postTag.deleteMany({ where: { postId: post.id } }).catch(() => {});
    await prisma.comment.deleteMany({ where: { postId: post.id } }).catch(() => {});
    await prisma.lead.deleteMany({ where: { postId: post.id } }).catch(() => {});
    
    await prisma.blogPost.delete({ where: { id: post.id } });

    revalidatePath('/');
    revalidatePath('/blog');

    return NextResponse.json({
      success: true,
      message: `Blog "${post.title}" deleted successfully`
    }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}
