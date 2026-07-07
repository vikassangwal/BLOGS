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
      const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
      for (const prov of fallbackProviders) {
        if (prov !== primaryProvider) {
          const k = getApiKeyForProvider(prov);
          if (k) {
            const m = prov.startsWith('gemini') ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
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
    const userPrompt = `You are tasked with translating the following blog post into ${targetLangName}.

CRITICAL RULES:
1. Translate the Title: You MUST translate the "Current Title" below. The translated title must represent the actual topic of the article. Do NOT replace it with section names from the content (e.g., do NOT use generic titles like "एक नज़र में", "Key Highlights", "अवलोकन", "At a Glance"). It must be high-CTR, engaging, and professional.
2. English Terms Preservation: For Indian languages, preserve common English acronyms, keywords, and job titles in Latin/English characters (e.g., keep "SSC GD", "UPSC", "admit card", "answer key", "apply online", "salary", "syllabus" in English as they are widely searched this way).
3. Preserve HTML: Retain all HTML tags exactly as they are. Do not translate HTML tag names, attributes, classes, or IDs. Only translate the text nodes.

Current Title to Translate: ${targetPost.title}

Content (HTML) to Translate:
${targetPost.content}

Response Format:
Return ONLY a JSON object with this structure:
{
  "title": "Your translated high-CTR title here",
  "content": "Your translated HTML content here"
}
Do not include any explanation or markdown formatting outside the JSON.`;

    let aiResponse;
    try {
      aiResponse = await generateAIContent(translatorConfigs, sysPrompt, userPrompt, 4000);
    } catch (error: any) {
      console.error("Translator AI Generation Failed:", error);
      return NextResponse.json({ status: 'error', message: `Translator Agent failed: ${error.message}` });
    }
    
    let parsedData;
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      const cleanJson = match ? match[0] : aiResponse;
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse translator JSON response", aiResponse);
      return NextResponse.json({ status: 'error', message: 'Failed to parse AI translation JSON. Check AI response formatting.' });
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
