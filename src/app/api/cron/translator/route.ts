import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';

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
    
    if (cronSecret !== expectedSecret && cronSecret !== 'knowora-cron-2026') {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    // 1. Check if AI Translator is enabled
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!siteSettings) throw new Error("Settings not found");

    let savedKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    } else if (siteSettings?.aiApiKey) {
      savedKeys['openai'] = siteSettings.aiApiKey;
      savedKeys['gemini'] = siteSettings.aiApiKey;
      savedKeys['openrouter'] = siteSettings.aiApiKey;
    }

    if (savedKeys.aiTranslatorActive === false) {
      return NextResponse.json({ status: 'skip', message: 'AI Translator Agent is disabled in Admin Panel.' });
    }

    function getApiKeyForProvider(p: string): string {
      let key = (savedKeys[p] || '').trim();
      if (!key) {
        const fallback = Object.values(savedKeys).find((v: any) => v && typeof v === 'string' && v.length >= 10);
        if (fallback) key = String(fallback).trim();
      }
      return key;
    }

    function buildTranslatorConfigs(): AIConfig[] {
      const list: AIConfig[] = [];
      const primaryProvider = savedKeys.translatorProvider || siteSettings?.aiProvider || 'gemini';
      const primaryModel = savedKeys.translatorModel || siteSettings?.aiModel || 'gemini-2.0-flash';
      const key1 = getApiKeyForProvider(primaryProvider);

      if (key1) {
        list.push({ provider: primaryProvider, apiKey: key1, model: primaryModel });
      }

      // Add fallbacks
      const fallbackProviders = ['gemini', 'openrouter', 'groq', 'openai', 'deepseek'];
      for (const prov of fallbackProviders) {
        if (prov !== primaryProvider) {
          const k = getApiKeyForProvider(prov);
          if (k) {
            const m = prov === 'gemini' ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
            list.push({ provider: prov, apiKey: k, model: m });
          }
        }
      }

      return list;
    }

    const translatorConfigs = buildTranslatorConfigs();
    if (translatorConfigs.length === 0) {
      throw new Error("No valid AI API keys configured for Translator Agent.");
    }

    // 2. Find a post that needs translation
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

    // 3. Translate using AI Multi-AI Fallback
    const sysPrompt = "You are an expert, native-level translator. You must return ONLY a valid JSON object. Do not include markdown blocks like ```json.";
    const userPrompt = `Translate the following blog post into ${targetLangName}. 
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
      aiResponse = await generateAIContent(translatorConfigs, sysPrompt, userPrompt, 4000);
    } catch (error: any) {
      console.error("Translator AI Generation Failed:", error);
      return NextResponse.json({ status: 'error', message: `Translator Agent failed: ${error.message}` });
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
