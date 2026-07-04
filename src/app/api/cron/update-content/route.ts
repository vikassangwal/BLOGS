import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    
    if (cronSecret !== expectedSecret) {
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
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings) throw new Error("Auto-blog settings not found");

    let savedKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    function buildAgentConfig(prefix: string, defaultProvider: string, defaultModel: string, defaultTokens: number) {
      const provider = savedKeys[`${prefix}Provider`] || defaultProvider;
      const model = (savedKeys[`${prefix}Model`] || defaultModel).trim();
      const maxTokens = parseInt(savedKeys[`${prefix}Tokens`]) || defaultTokens;
      const fallbackProvider = savedKeys[`${prefix}FallbackProvider`] || null;
      const fallbackModel = (savedKeys[`${prefix}FallbackModel`] || '').trim() || null;
      
      const getApiKey = (p: string) => {
        let key = savedKeys[p] || '';
        if (!key && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) key = siteSettings.aiApiKey;
        if (!key) {
          const allKeyNames = Object.keys(savedKeys).filter(k => 
            !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
            savedKeys[k] && savedKeys[k].length >= 10
          );
          if (allKeyNames.length > 0) key = savedKeys[allKeyNames[0]];
        }
        return key.trim();
      };
      
      return {
        primary: { provider: provider as any, apiKey: getApiKey(provider), model },
        fallback: (fallbackProvider && fallbackModel) ? { provider: fallbackProvider as any, apiKey: getApiKey(fallbackProvider), model: fallbackModel } : null,
        maxTokens
      };
    }

    async function generateContentWithFallback(config: any, sysPrompt: string, userPrompt: string) {
      try {
        return await generateAIContent(config.primary, sysPrompt, userPrompt, config.maxTokens);
      } catch (err: any) {
        if (!config.fallback) throw err;
        console.warn(`[Updater Fallback] Primary failed. Switching to ${config.fallback.provider}...`);
        return await generateAIContent(config.fallback, sysPrompt, userPrompt, config.maxTokens);
      }
    }

    const rModel = settings.researcherModel || '';
    const wModel = settings.writerModel || '';
    const researcherConfig = buildAgentConfig('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
    const writerConfig = buildAgentConfig('writer', 'openrouter', wModel || 'openai/gpt-4o-mini', 4000);

    // 2. Find the oldest published post (older than 30 days) to update
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldPost = await prisma.blogPost.findFirst({
      where: { 
        status: 'Published',
        updatedAt: { lt: thirtyDaysAgo }
      },
      orderBy: { updatedAt: 'asc' }
    });

    if (!oldPost) {
      return NextResponse.json({ status: 'skip', message: 'No old posts require updating right now.' });
    }

    // 3. Researcher Agent: Find new info
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const researchPrompt = `Find the latest news, updates, or changes regarding the topic: "${oldPost.title}". 
Today's date is ${currentDate}. 
Provide a short bulleted list of only NEW facts or developments that have happened recently. If there are no new updates, reply with "NO_NEW_UPDATES".`;
    
    const newResearch = await generateContentWithFallback(researcherConfig, "You are a factual news researcher. Reply only with new facts.", researchPrompt);

    if (newResearch.includes("NO_NEW_UPDATES")) {
      // Just bump the updatedAt timestamp so we don't check it again soon
      await prisma.blogPost.update({
        where: { id: oldPost.id },
        data: { updatedAt: new Date() }
      });
      return NextResponse.json({ status: 'success', message: `Post "${oldPost.title}" checked. No updates needed.` });
    }

    // 4. Writer Agent: Append new section to the article
    const writerPrompt = `I have an existing blog post. I need you to write an "Update: ${currentDate}" section to be appended at the TOP of the article.
Here is the new information to include:
${newResearch}

Write 2-3 engaging paragraphs in Hindi (Devanagari script) mixed with English tech words. 
Format it in HTML. Start with an <h2>Latest Update: ${new Date().getFullYear()}</h2> and include the new facts organically.
Respond ONLY with the HTML snippet. Do not include markdown \`\`\`html tags.`;

    const writerResponse = await generateContentWithFallback(writerConfig, "You are an expert SEO Hindi Blogger.", writerPrompt);
    const cleanUpdateHtml = writerResponse.replace(/^```html\n?|```$/g, '').trim();

    // 5. Prepend update and save
    const updatedContent = `<div class="latest-update-box" style="background: #f8f9fa; padding: 15px; border-left: 4px solid #0066cc; margin-bottom: 20px;">
  ${cleanUpdateHtml}
</div>
${oldPost.content}`;

    await prisma.blogPost.update({
      where: { id: oldPost.id },
      data: { 
        content: updatedContent,
        updatedAt: new Date()
      }
    });

    try {
      revalidatePath(`/blog/${oldPost.slug}`);
      revalidatePath(`/blog`);
    } catch(e) {}

    return NextResponse.json({ 
      status: 'success', 
      message: `Successfully updated post: ${oldPost.title}` 
    });

  } catch (error: any) {
    console.error('Content Updater Agent failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
