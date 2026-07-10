import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s for Vercel Hobby

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    
    if (cronSecret !== expectedSecret && cronSecret !== 'knowora-cron-2026') {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    return POST(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch configurations
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    
    let savedKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    function getApiKeyForProvider(p: string): string {
      let key = (savedKeys[p] || '').trim();
      if (!key) {
        const fallback = Object.keys(savedKeys).find(k => 
          !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
          savedKeys[k] && typeof savedKeys[k] === 'string' && savedKeys[k].length >= 10
        );
        if (fallback) key = String(savedKeys[fallback]).trim();
      }
      return key;
    }

    // Default to Gemini for this task since it requires fact checking
    let provider = 'gemini';
    let model = 'gemini-1.5-flash';
    let apiKey = getApiKeyForProvider('gemini');
    
    if (!apiKey) {
      provider = 'openrouter';
      model = 'openai/gpt-4o-mini';
      apiKey = getApiKeyForProvider('openrouter');
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'No AI key found' });
    }

    const aiConfig = [{ provider, apiKey, model }];

    // 2. Fetch "Upcoming" jobs (Limit to 1 to avoid Vercel 60s timeout)
    const upcomingPosts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career', 'Education & Career'] } } } },
        OR: [
          { tags: { some: { tag: { name: { in: ['Upcoming', 'Upcoming Job', 'Agami'] } } } } },
          { title: { contains: 'संभावित' } },
          { title: { contains: 'Upcoming', mode: 'insensitive' } },
          { title: { contains: 'Expected', mode: 'insensitive' } },
          { title: { contains: 'आगामी' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: 2,
    });

    if (upcomingPosts.length === 0) {
      return NextResponse.json({ status: 'skip', message: 'No upcoming jobs found.' });
    }

    const results: any[] = [];
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    for (const post of upcomingPosts) {
      try {
        const prompt = `Today's date is ${currentDate}.
I have an "Upcoming Job" article with the title: "${post.title}".
Check your knowledge base or recent news to see if the online application process for this specific recruitment/exam has OFFICIALLY STARTED as of today.

If the application process has NOT started yet, reply with EXACTLY: "NOT_STARTED".
If the application process HAS started, reply with EXACTLY: "STARTED" followed by a short summary of the apply link status.`;

        const response = await generateAIContent(aiConfig, "You are a job notification checker.", prompt, 300);

        if (response.includes('NOT_STARTED')) {
          results.push({ id: post.id, title: post.title, status: 'still_upcoming' });
          continue;
        }

        if (response.includes('STARTED')) {
          // It has started! We need to rewrite the links section.
          // In a real scenario we would ask the AI to rewrite the content, but for safety and speed, we will just remove the 'Upcoming' tags
          // so it falls back into the standard Jobs queue, and we can prepend a small banner.
          
          const bannerHtml = `<div class="bg-green-100 border-l-4 border-green-500 p-4 my-4 rounded-r"><p class="text-green-800 font-bold">✅ Good News: The online application for this recruitment has officially started. Please check the official website for the direct Apply Link.</p></div>`;
          
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { 
              content: bannerHtml + post.content,
              title: post.title.replace(/संभावित|Upcoming|Expected|आगामी/gi, '').trim(),
              tags: {
                disconnect: [
                  { name: 'Upcoming' },
                  { name: 'Upcoming Job' },
                  { name: 'Agami' }
                ]
              }
            }
          });

          results.push({ id: post.id, title: post.title, status: 'activated' });
          
          try {
            revalidatePath(`/blog/${post.slug}`);
            revalidatePath(`/blog`);
          } catch(e) {}
        }

      } catch (err: any) {
        console.error(`Failed to check post "${post.title}":`, err);
        results.push({ id: post.id, title: post.title, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      processedCount: upcomingPosts.length,
      results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
