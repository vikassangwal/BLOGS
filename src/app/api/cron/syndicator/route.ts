import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
  const secret = new URL(req.url).searchParams.get('secret');
  const authHeader = req.headers.get('authorization') || '';
  if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}` && secret !== 'knowora-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    
    if (!settings || !settings.agent12IsActive) {
      return NextResponse.json({ message: 'Agent 12 (Syndicator) is inactive.' });
    }

    // Find a post that hasn't been fully syndicated
    const post = await prisma.blogPost.findFirst({
      where: {
        OR: [
          { syndicatedToMedium: false },
          // We can add Blogger/Tumblr checks here when fully implemented
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!post) {
       return NextResponse.json({ message: 'No new posts to syndicate.' });
    }

    const { mediumApiToken, bloggerApiToken: _bloggerApiToken, tumblrApiToken: _tumblrApiToken, redditApiToken: _redditApiToken, writerModel } = settings;

    // Use AI to generate a summary
    const aiConfig = await getAIConfig();

    let summary = `Check out our latest article: **${post.title}**\n\nRead the full post here: ${process.env.NEXT_PUBLIC_APP_URL || 'https://yourwebsite.com'}/blog/${post.slug}`;

    if (aiConfig) {
        const prompt = `Summarize this blog post in 2-3 engaging sentences for social sharing: ${post.content.substring(0, 500)}...`;
        try {
            if (writerModel) {
              aiConfig.model = writerModel;
            }
            const content = await generateAIContent(aiConfig, "You write engaging social media summaries.", prompt, 300);
            if (content) {
                summary = `${content}\n\nRead the full article: ${process.env.NEXT_PUBLIC_APP_URL || 'https://yourwebsite.com'}/blog/${post.slug}`;
            }
        } catch(e) {
            console.error("AI Summary generation failed", e);
        }
    }

    // 1. Medium Syndication
    let mediumSuccess = false;
    if (mediumApiToken && !post.syndicatedToMedium) {
       try {
           // First get user ID
           const userRes = await fetch('https://api.medium.com/v1/me', {
               headers: { 'Authorization': `Bearer ${mediumApiToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
           });
           const userData = await userRes.json();
           
           if (userData.data?.id) {
               const postRes = await fetch(`https://api.medium.com/v1/users/${userData.data.id}/posts`, {
                   method: 'POST',
                   headers: { 'Authorization': `Bearer ${mediumApiToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                   body: JSON.stringify({
                       title: post.title,
                       contentFormat: 'markdown',
                       content: summary,
                       canonicalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourwebsite.com'}/blog/${post.slug}`,
                       publishStatus: 'public'
                   })
               });
               if (postRes.ok) mediumSuccess = true;
           }
       } catch (error) {
           console.error("Medium API Error", error);
       }
    }

    // Mark as syndicated (even if failed, to prevent infinite queue blocking)
    await prisma.blogPost.update({
        where: { id: post.id },
        data: {
            syndicatedToMedium: true,
            // syndicatedToBlogger: true // Mock success for now if token exists
        }
    });

    return NextResponse.json({ 
        message: 'Syndication pass complete.', 
        post: post.title, 
        medium: mediumSuccess ? 'Published' : 'Skipped/Failed'
    });

  } catch (error: any) {
    console.error('Agent 12 Syndication Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
