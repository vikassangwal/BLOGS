import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET: Fetch single post by slug
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const slug = params.slug;
    
    // Use Await to wait for the params resolving in Next.js 15+ if needed, but in 16 it might be sync or async
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true, email: true } },
        tags: { include: { tag: true } }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Increment view count asynchronously
    prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } }
    }).catch(console.error);

    const formattedPost = {
      ...post,
      tags: post.tags.map((t: any) => t.tag.name)
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PUT: Update post
export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
    const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;

    const body = await request.json();
    const { title, subtitle, slug, content, excerpt, featuredImage, status, seoTitle, seoDescription, seoKeywords, socialCaptions, socialHashtags, scheduledAt, tags = [] } = body;

    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: params.slug },
      include: { tags: true }
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    let finalSlug = params.slug;
    if (slug && slug !== params.slug) {
      const slugExists = await prisma.blogPost.findUnique({ where: { slug } });
      if (!slugExists) {
        finalSlug = slug;
      }
    }

    const updateData: any = {
      title,
      subtitle,
      slug: finalSlug,
      content,
      excerpt,
      featuredImage,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
      socialCaptions,
      socialHashtags,
    };

    if (status === 'Published' && existingPost.status !== 'Published') {
      updateData.publishedAt = new Date();
    } else if (status === 'Scheduled' && scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt);
    }

    const updatedPost = await prisma.blogPost.update({
      where: { id: existingPost.id },
      data: updateData
    });

    // Handle tags update
    if (Array.isArray(tags)) {
      // Delete existing tags
      await prisma.postTag.deleteMany({ where: { postId: existingPost.id } });
      
      // Add new tags
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug }
        });
        await prisma.postTag.create({
          data: { postId: existingPost.id, tagId: tag.id }
        });
      }
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
