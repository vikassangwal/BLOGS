import { NextRequest, NextResponse } from 'next/server';
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

    const response = NextResponse.json(formattedPost);
    // Cache for 15 minutes on CDN (Edge), stale-while-revalidate for 1 hour
    response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PUT: Update post
export async function PUT(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
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

    // Social Media Auto-Poster Logic
    if (status === 'Published' && existingPost.status !== 'Published') {
      try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        if (settings?.aiApiKey?.startsWith('{')) {
          const parsedKeys = JSON.parse(settings.aiApiKey);
          const postUrl = `https://antigravity.com/blog/${updatedPost.slug}`;
          const message = socialCaptions ? `${socialCaptions}\n\nRead more: ${postUrl}` : `New Post: ${title}!\n\nRead more: ${postUrl}`;
          
          if (parsedKeys.twitter) {
            console.log(`[Twitter Auto-Post] Sending tweet using key: ${parsedKeys.twitter.substring(0, 5)}... Message: ${message}`);
            // TODO: Implement actual twitter-api-v2 call here
          }
          if (parsedKeys.facebook) {
            console.log(`[Facebook Auto-Post] Posting to FB page using token: ${parsedKeys.facebook.substring(0, 5)}... Message: ${message}`);
            // TODO: Implement actual Facebook Graph API call here
          }
          if (parsedKeys.instagram) {
            console.log(`[Instagram Auto-Post] Posting to IG using token: ${parsedKeys.instagram.substring(0, 5)}... Image: ${featuredImage}`);
            // TODO: Implement actual Instagram Graph API call here
          }
          
          if (parsedKeys.onesignalAppId && parsedKeys.onesignalApiKey) {
            console.log(`[OneSignal] Sending push notification...`);
            fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${parsedKeys.onesignalApiKey}`
              },
              body: JSON.stringify({
                app_id: parsedKeys.onesignalAppId,
                included_segments: ['Subscribed Users'],
                headings: { en: title || updatedPost.title },
                contents: { en: excerpt || updatedPost.excerpt || 'Read our latest post!' },
                url: postUrl,
                big_picture: featuredImage || updatedPost.featuredImage
              })
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to trigger social media auto-post', err);
      }
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
