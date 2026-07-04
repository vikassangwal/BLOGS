import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

// Top 5 languages to target for auto-translation to save API costs
const TARGET_LANGS = [
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    
    if (cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    // 1. Check if AI Translator is enabled
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!siteSettings) throw new Error("Settings not found");

    let apiKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { apiKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    if (apiKeys.aiTranslatorActive === false) {
      return NextResponse.json({ status: 'skip', message: 'AI Translator Agent is disabled in Admin Panel.' });
    }

    const provider = apiKeys.translatorProvider || 'openrouter';
    const model = (apiKeys.translatorModel || 'google/gemini-2.5-flash').trim();
    const maxTokens = parseInt(apiKeys.translatorTokens) || 4000;

    const getApiKey = (p: string) => {
      let key = apiKeys[p] || '';
      if (!key && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) key = siteSettings.aiApiKey;
      if (!key) {
        const allKeyNames = Object.keys(apiKeys).filter(k => 
          !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
          apiKeys[k] && apiKeys[k].length >= 10
        );
        if (allKeyNames.length > 0) key = apiKeys[allKeyNames[0]];
      }
      return key.trim();
    };

    const aiConfig = { provider: provider as any, apiKey: getApiKey(provider), model, maxTokens };

    // 2. Find a post that needs translation
    // Since we can't easily query inside JSON in Prisma (depends on DB type), we fetch a few recent posts and check in memory
    const recentPosts = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 10
    });

    let targetPost = null;
    let targetLangCode = null;
    let targetLangName = null;

    for (const post of recentPosts) {
      const translations: any = post.translations || {};
      for (const lang of TARGET_LANGS) {
        if (!translations[lang.code]) {
          targetPost = post;
          targetLangCode = lang.code;
          targetLangName = lang.name;
          break;
        }
      }
      if (targetPost) break;
    }

    if (!targetPost) {
      return NextResponse.json({ status: 'skip', message: 'All recent posts are fully translated!' });
    }

    // 3. Translate using AI
    const sysPrompt = "You are an expert, native-level translator. You must return ONLY a valid JSON object. Do not include markdown blocks like ```json.";
    const userPrompt = `Translate the following English blog post into ${targetLangName}. 
Ensure the translation sounds natural and professional. Retain all HTML tags exactly as they are. Do not translate HTML attributes, classes, or IDs. Only translate the text content.

Current Title: ${targetPost.title}

Content (HTML):
${targetPost.content}

Return a JSON object with this exact structure:
{
  "title": "Translated title here",
  "content": "Translated HTML content here"
}
Respond ONLY with the JSON.`;

    let aiResponse;
    try {
      aiResponse = await generateAIContent(aiConfig, sysPrompt, userPrompt, aiConfig.maxTokens);
    } catch (error) {
      console.warn("Primary Translator Model failed, attempting fallback...");
      const backupStr = apiKeys.translatorBackupModel?.trim();
      if (backupStr) {
        let backupProvider = provider;
        let backupModelName = backupStr;
        if (backupStr.includes('/')) {
          const parts = backupStr.split('/');
          backupProvider = parts[0];
          backupModelName = parts.slice(1).join('/');
        }
        const backupConfig = { provider: backupProvider as any, apiKey: getApiKey(backupProvider), model: backupModelName, maxTokens };
        aiResponse = await generateAIContent(backupConfig, sysPrompt, userPrompt, backupConfig.maxTokens);
      } else {
        throw error;
      }
    }
    
    let parsedData;
    try {
      const cleanJson = aiResponse.replace(/^```json\n?|```$/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse translator JSON response", aiResponse);
      return NextResponse.json({ status: 'error', message: 'Failed to parse AI translation JSON.' });
    }

    // 4. Update the Database
    const currentTranslations: any = targetPost.translations || {};
    currentTranslations[targetLangCode!] = {
      title: parsedData.title,
      content: parsedData.content,
      translatedAt: new Date().toISOString()
    };

    await prisma.blogPost.update({
      where: { id: targetPost.id },
      data: { translations: currentTranslations }
    });

    return NextResponse.json({ 
      status: 'success', 
      message: `Translated post '${targetPost.title}' to ${targetLangName}` 
    });

  } catch (error: any) {
    console.error('Translator Agent failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
