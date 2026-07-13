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
    const expectedSecret = process.env.CRON_SECRET;
    
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

    function buildAgentConfigs(prefix: string, defaultProvider: string, defaultModel: string, defaultTokens: number) {
      const primaryProvider = savedKeys[`${prefix}Provider`] || siteSettings?.aiProvider || defaultProvider;
      const primaryModel = (savedKeys[`${prefix}Model`] || siteSettings?.aiModel || defaultModel).trim();
      const maxTokens = parseInt(savedKeys[`${prefix}Tokens`]) || defaultTokens;

      const configs: any[] = [];
      const key1 = getApiKeyForProvider(primaryProvider);
      if (key1) {
        configs.push({ provider: primaryProvider, apiKey: key1, model: primaryModel });
      }

      // Add fallbacks
      const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
      for (const prov of fallbackProviders) {
        const k = (savedKeys[prov] || '').trim();
        if (k && k.length >= 10 && prov !== primaryProvider) {
          const m = prov.startsWith('gemini') ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : prov === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';
          configs.push({ provider: prov, apiKey: k, model: m });
        }
      }

      if (configs.length === 0) {
        const anyKey = getApiKeyForProvider('gemini');
        if (anyKey) {
          configs.push({ provider: 'gemini', apiKey: anyKey, model: 'gemini-2.0-flash' });
        }
      }

      return { configs, maxTokens };
    }

    async function generateContentWithFallback(configObj: any, sysPrompt: string, userPrompt: string) {
      if (!configObj.configs || configObj.configs.length === 0) {
        throw new Error("No AI API Keys found in Admin Settings. Please enter your Gemini API Key.");
      }
      return await generateAIContent(configObj.configs, sysPrompt, userPrompt, configObj.maxTokens);
    }

    const rModel = settings.researcherModel || '';
    const wModel = settings.writerModel || '';
    const researcherConfig = buildAgentConfigs('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
    const writerConfig = buildAgentConfigs('writer', 'openrouter', wModel || 'openai/gpt-4o-mini', 4000);

    // 2. Parse parameters and query posts to update
    let timeRange = 'all';
    let batchSize = 1;
    let order = 'oldest';

    try {
      const { searchParams } = new URL(request.url);
      if (searchParams.get('timeRange')) timeRange = searchParams.get('timeRange')!;
      if (searchParams.get('batchSize')) batchSize = Math.min(5, parseInt(searchParams.get('batchSize')!) || 1);
      if (searchParams.get('order')) order = searchParams.get('order')!;

      // Also try to read from POST body
      const body = await request.clone().json().catch(() => ({}));
      if (body.timeRange) timeRange = body.timeRange;
      if (body.batchSize) batchSize = Math.min(5, parseInt(body.batchSize) || 1);
      if (body.order) order = body.order;
    } catch(e) {}

    const whereClause: any = {
      status: 'Published',
      allowAutoUpdate: true,
    };

    if (timeRange === '24h') {
      whereClause.publishedAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (timeRange === '7d') {
      whereClause.publishedAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (timeRange === '30d') {
      whereClause.publishedAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    let orderByObj: any = { updatedAt: 'asc' };
    if (order === 'newest') {
      orderByObj = { publishedAt: 'desc' };
    } else if (order === 'oldest') {
      orderByObj = { publishedAt: 'asc' };
    } else if (order === 'popular') {
      orderByObj = { viewCount: 'desc' };
    }

    const postsToUpdate = await prisma.blogPost.findMany({
      where: whereClause,
      orderBy: orderByObj,
      take: batchSize
    });

    if (postsToUpdate.length === 0) {
      return NextResponse.json({ status: 'skip', message: 'No posts matched the update criteria.' });
    }

    const results: any[] = [];
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    for (const oldPost of postsToUpdate) {
      try {
        // 3. Researcher Agent: Find new info
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
          results.push({ id: oldPost.id, title: oldPost.title, status: 'checked_no_update' });
          continue;
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

        // Google Indexing API submission for updated post
        if (settings.googleIndexingJson) {
          try {
            const { submitToGoogleIndexing } = require('@/lib/google-indexing');
            const postUrl = `https://knowora.in/blog/${oldPost.slug}`;
            console.log("Submitting updated post to Google Indexing API:", postUrl);
            await submitToGoogleIndexing(postUrl, 'URL_UPDATED', settings.googleIndexingJson);
          } catch (e) {
            console.error("Google Indexing failed for updated post:", e);
          }
        }

        results.push({ id: oldPost.id, title: oldPost.title, status: 'updated' });
      } catch (err: any) {
        console.error(`Failed to update post "${oldPost.title}":`, err);
        results.push({ id: oldPost.id, title: oldPost.title, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      processedCount: postsToUpdate.length,
      results
    });

  } catch (error: any) {
    console.error('Content Updater Agent failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
