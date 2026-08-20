import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetSlug = searchParams.get('slug');
    const limit = parseInt(searchParams.get('limit') || '5');

    // 1. Fetch site settings & AI keys
    const [siteSettings, autoBlogSettings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } }),
    ]);

    let savedKeys: Record<string, string> = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    const configs: AIConfig[] = [];
    const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
    for (const prov of fallbackProviders) {
      const k = (savedKeys[prov] || '').trim();
      if (k && k.length >= 10) {
        let m = 'gemini-2.5-flash';
        if (prov === 'groq') m = 'llama-3.3-70b-versatile';
        else if (prov === 'openai') m = 'gpt-4o-mini';
        else if (prov === 'deepseek') m = 'deepseek-chat';
        configs.push({ provider: prov, apiKey: k, model: m });
      }
    }

    if (configs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No AI API keys configured. Please configure Gemini or OpenAI key in Admin Settings.' 
      }, { status: 400 });
    }

    // 2. Find incomplete posts (either specific slug or all short/research posts)
    let postsToRewrite: any[] = [];
    if (targetSlug) {
      const singlePost = await prisma.blogPost.findUnique({ where: { slug: targetSlug } });
      if (singlePost) postsToRewrite = [singlePost];
    } else {
      const allPosts = await prisma.blogPost.findMany({
        where: {
          OR: [
            { status: 'Published' },
            { status: 'Writing_Completed' },
            { status: 'Draft' }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });

      // Filter in-memory for posts that are incomplete, short (<1500 chars), or raw research
      postsToRewrite = allPosts.filter(p => {
        const plain = (p.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const isRawResearch = (p.content || '').startsWith('Topic:') || (p.content || '').includes('Research notes for');
        return plain.length < 1500 || isRawResearch;
      }).slice(0, limit);
    }

    if (postsToRewrite.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No incomplete posts found! All published articles meet the 1500+ character completeness standard.' 
      });
    }

    const rewrittenResults: any[] = [];

    // 3. Re-write each incomplete post to full 1500+ word comprehensive article
    for (const post of postsToRewrite) {
      try {
        console.log(`[Auto-Repair] Rewriting incomplete post: ${post.title} (slug: ${post.slug})`);

        const writerSystemPrompt = `You are India's premier Hindi Blog Writer and SEO Expert. 
You write comprehensive, 100% complete, highly engaging viral Hindi articles in clean HTML.
CRITICAL MANDATORY RULES:
1. NEVER stop writing mid-article. You MUST write a FULL 1200-1500+ word article from Introduction to Conclusion.
2. Structure: 
   - <h2>Introduction</h2> (Engaging overview)
   - <h2>?? ???? ??? (Key Highlights)</h2> (Bullet list)
   - <h2>?????????? ????? (Detailed Information)</h2> (Tables and factual breakdowns)
   - <h2>??????? ?? ???? (Eligibility & Guidelines)</h2>
   - <h2>?????????? ??????? ?? ?????? (Important Dates & Links)</h2> (Tables with <a href="..." target="_blank">?? Click Here</a>)
   - <h2>????? ???? ???? ???? ?????? (FAQ)</h2> (2-3 complete questions with detailed answers in <details><summary>...</summary><p>...</p></details>)
   - <h2>Conclusion</h2> (Final advice + WhatsApp/Telegram share CTA)
3. Use clean HTML only (<h2>, <h3>, <p>, <table>, <ul>, <details>). No Markdown.`;

        const writerPrompt = `Topic: "${post.title}"
Existing Context & Notes:
${post.content}

Write a completely finished, authoritative, 100% comprehensive Hindi HTML blog post on this topic. Make sure all dates for 2026 are accurate, all instructions are clear, and the article is fully written from start to finish without getting cut off.`;

        let fullArticleHtml = await generateAIContent(configs, writerSystemPrompt, writerPrompt, 8000, true);
        fullArticleHtml = fullArticleHtml.replace(/^```html\n?|```$/g, '').trim();

        const plainCheck = fullArticleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainCheck.length < 1200) {
          throw new Error(`AI generated too short content (${plainCheck.length} chars).`);
        }

        // Update post in database
        const updated = await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            content: fullArticleHtml,
            status: 'Published',
            updatedAt: new Date(),
          }
        });

        try {
          revalidatePath(`/blog/${post.slug}`);
          revalidatePath('/blog');
          revalidatePath('/');
        } catch(e) {}

        rewrittenResults.push({
          id: post.id,
          title: post.title,
          slug: post.slug,
          previousLength: (post.content || '').length,
          newLength: fullArticleHtml.length,
          status: 'rewritten_and_published'
        });

      } catch (err: any) {
        console.error(`Failed to rewrite post "${post.title}":`, err);
        rewrittenResults.push({
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: 'failed',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: rewrittenResults.length,
      results: rewrittenResults
    });

  } catch (error: any) {
    console.error('Error in rewrite-incomplete endpoint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
