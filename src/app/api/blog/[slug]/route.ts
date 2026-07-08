import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// -------------------------------------------------------------
// HELPER: WhatsApp Auto-Poster
// -------------------------------------------------------------
async function postToWhatsApp(token: string, phoneId: string, groupId: string, text: string, imageUrl: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: groupId, type: 'image', image: { link: imageUrl, caption: text } })
    });
    return res.ok;
  } catch(e) { return false; }
}

// -------------------------------------------------------------
// HELPER: Instagram Auto-Poster
// -------------------------------------------------------------
async function postToInstagram(token: string, accountId: string, imageUrl: string, caption: string) {
  try {
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`, { method: 'POST' });
    const containerData = await containerRes.json();
    if (containerData.id) {
      await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${containerData.id}&access_token=${token}`, { method: 'POST' });
      return true;
    }
    return false;
  } catch(e) { return false; }
}

// -------------------------------------------------------------
// HELPER: Twitter Auto-Poster (v2)
// -------------------------------------------------------------
async function postToTwitter(bearerToken: string, text: string) {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return res.ok;
  } catch (e) { return false; }
}

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
    // Cache for 15 minutes on CDN (Edge), stale-while-revalidate for 5 min
    response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300');
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
    const { title, subtitle, slug, content, excerpt, featuredImage, status, seoTitle, seoDescription, seoKeywords, socialCaptions, socialHashtags, scheduledAt, tags = [], doubleLinkFormat } = body;

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
      translations: {
        ...(existingPost.translations as any || {}),
        metadata: {
          ...((existingPost.translations as any)?.metadata || {}),
          doubleLinkFormat: !!doubleLinkFormat
        }
      }
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
        const savedKeys = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
        if (savedKeys) {
          const actualTitle = title || updatedPost.title;
          const actualImage = featuredImage || updatedPost.featuredImage;
          const socialCaption = socialCaptions || `Check out our latest article: ${actualTitle}\n\nRead more here: https://www.knowora.in/blog/${updatedPost.slug}\n\n${socialHashtags || ''}`;
          const socialImageUrl = `https://www.knowora.in/api/og?title=${encodeURIComponent(actualTitle)}&bg=${encodeURIComponent(actualImage)}`;

          // 1. WhatsApp
          if (savedKeys.whatsappToken && savedKeys.whatsappPhoneId && savedKeys.whatsappGroupId) {
            await postToWhatsApp(savedKeys.whatsappToken, savedKeys.whatsappPhoneId, savedKeys.whatsappGroupId, socialCaption, socialImageUrl);
          }

          // 2. Instagram
          if (savedKeys.instagramToken && savedKeys.instagramAccountId) {
            await postToInstagram(savedKeys.instagramToken, savedKeys.instagramAccountId, socialImageUrl, socialCaption);
          }

          // 3. Twitter
          if (savedKeys.twitter) {
            await postToTwitter(savedKeys.twitter, socialCaption);
          }

          // 4. Telegram
          if (savedKeys.telegramToken && savedKeys.telegramChatId) {
            await fetch(`https://api.telegram.org/bot${savedKeys.telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: savedKeys.telegramChatId,
                text: socialCaption,
                parse_mode: 'HTML'
              })
            }).catch(() => {});
          }
          
          // 5. OneSignal Push Notifications
          if (savedKeys.onesignalAppId && savedKeys.onesignalApiKey) {
            await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${savedKeys.onesignalApiKey}`
              },
              body: JSON.stringify({
                app_id: savedKeys.onesignalAppId,
                included_segments: ['Subscribed Users'],
                headings: { en: actualTitle },
                contents: { en: excerpt || updatedPost.excerpt || 'Read our latest post!' },
                url: `https://www.knowora.in/blog/${updatedPost.slug}`,
                big_picture: socialImageUrl
              })
            }).catch(() => {});
          }

          // 6. Google Indexing API Submission (Instant indexation for manual edits)
          if (savedKeys.googleIndexingJson) {
            try {
              const { submitToGoogleIndexing } = require('@/lib/google-indexing');
              const postUrl = `https://knowora.in/blog/${updatedPost.slug}`;
              console.log("Submitting manually edited post to Google Indexing API:", postUrl);
              await submitToGoogleIndexing(postUrl, 'URL_UPDATED', savedKeys.googleIndexingJson);
            } catch (e) {
              console.error("Google Indexing failed for edited post:", e);
            }
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
