import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes

function isArticleIncomplete(content: string = ''): boolean {
  if (!content) return true;
  const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 1. Length check: Must be at least 1500 characters
  if (plain.length < 1500) return true;

  // 2. Draft/Research check
  if (content.startsWith('Topic:') || content.includes('Research notes for') || content.includes('ABORT_')) return true;

  // 3. Truncation check (ended mid-sentence without closing tag)
  const tail = content.slice(-120);
  const looksTruncated = !/[.!??>]\s*$/.test(content.trim()) && !/<\/(p|div|ul|ol|table|h[1-6]|blockquote|details)>\s*$/i.test(tail);
  if (looksTruncated) return true;

  // 4. Missing conclusion or FAQs
  const hasConclusion = content.toLowerCase().includes('conclusion') || content.includes('????????') || content.includes('?????????? ????');
  const hasFaq = content.toLowerCase().includes('faq') || content.includes('????? ???? ???? ???? ??????') || content.includes('<details>');
  if (!hasConclusion && !hasFaq) return true;

  return false;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetSlug = searchParams.get('slug');
    const forceAll = searchParams.get('force') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Auto-clean stuck raw research drafts older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.blogPost.deleteMany({
      where: {
        status: 'Researching',
        createdAt: { lt: oneHourAgo }
      }
    }).catch(() => {});

    // 2. Find incomplete posts
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
        take: 100
      });

      // Filter for incomplete posts
      postsToRewrite = allPosts.filter(p => forceAll || isArticleIncomplete(p.content)).slice(0, limit);
    }

    if (postsToRewrite.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All articles are 100% complete! No incomplete posts found.' 
      });
    }

    const rewrittenResults: any[] = [];

    // 3. Re-write each incomplete post to full 100% complete article
    for (const post of postsToRewrite) {
      try {
        console.log(`[Auto-Repair] Rewriting to 100% complete article: ${post.title} (slug: ${post.slug})`);

        const writerSystemPrompt = `You are India's top Hindi Content Writer and SEO Expert.
You write 100% complete, highly engaging, viral Hindi articles in clean semantic HTML.
STRICT MANDATORY RULES:
1. NEVER STOP WRITING MID-ARTICLE. You MUST write the ENTIRE post from Title to Conclusion without cutting off.
2. The article MUST include all of these HTML sections:
   - <h2>Introduction (??????)</h2>
   - <h2>?? ???? ??? (Key Highlights)</h2>
   - <h2>?????????? ????? ??? ?????? (Quick Overview Table)</h2>
   - <h2>???????, ???? ?? ????????? (Eligibility, Rules & Step-by-Step Guide)</h2>
   - <h2>?????????? ?????? (Important Links Table)</h2> (with <a href="..." target="_blank">?? Click Here</a>)
   - <h2>????? ???? ???? ???? ?????? (FAQ)</h2> (2-3 detailed Q&As in <details><summary>...</summary><p>...</p></details>)
   - <h2>???????? (Conclusion)</h2> (Final takeaways + WhatsApp/Telegram share note)
3. Use clean HTML only (<h2>, <h3>, <p>, <table>, <ul>, <details>, <summary>). Never output Markdown.`;

        const writerPrompt = `Topic: "${post.title}"
Existing Context & Notes:
${post.content}

Write a 100% COMPLETE, authoritative, rich Hindi HTML blog post on this topic. Ensure all factual details, dates for 2026, eligibility rules, and official links are included and that the article concludes completely without truncation.`;

        let fullArticleHtml = await generateAIContent(configs, writerSystemPrompt, writerPrompt, 8000, true);
        fullArticleHtml = fullArticleHtml.replace(/^```html\n?|```$/g, '').trim();

        const plainCheck = fullArticleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainCheck.length < 1200) {
          throw new Error(`AI generated too short content (${plainCheck.length} chars).`);
        }

        // Update post in database
        await prisma.blogPost.update({
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
          status: '100% Complete & Published'
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
      processedCount: rewrittenResults.length,
      results: rewrittenResults
    });

  } catch (error: any) {
    console.error('Error in rewrite-incomplete endpoint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
