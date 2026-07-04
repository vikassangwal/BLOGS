import { NextResponse } from 'next/server';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(`translate_${ip}`, 5, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const { htmlContent, targetLanguage, sourceLang } = body;

    if (!htmlContent || !targetLanguage) {
      return NextResponse.json({ error: 'Missing content or target language' }, { status: 400 });
    }

    // Size limit: 50KB max
    if (htmlContent.length > 50000) {
      return NextResponse.json({ error: 'Content too large (max 50,000 chars). Try translating smaller sections.' }, { status: 413 });
    }

    const aiConfig = await getAIConfig();
    if (!aiConfig) {
      return NextResponse.json({ error: 'AI is not configured. Please add an API key in Settings.' }, { status: 400 });
    }

    // Language name mapping for better AI understanding
    const languageNames: Record<string, string> = {
      'hi': 'Hindi (हिन्दी)', 'bn': 'Bengali (বাংলা)', 'te': 'Telugu (తెలుగు)',
      'mr': 'Marathi (मराठी)', 'ta': 'Tamil (தமிழ்)', 'gu': 'Gujarati (ગુજરાતી)',
      'ur': 'Urdu (اردو)', 'kn': 'Kannada (ಕನ್ನಡ)', 'ml': 'Malayalam (മലയാളം)',
      'pa': 'Punjabi (ਪੰਜਾਬੀ)', 'en': 'English', 'es': 'Spanish (Español)',
      'fr': 'French (Français)', 'de': 'German (Deutsch)', 'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)', 'zh': 'Chinese (中文)', 'ar': 'Arabic (العربية)',
      'pt': 'Portuguese (Português)', 'ru': 'Russian (Русский)', 'it': 'Italian (Italiano)',
    };

    const targetLangFull = languageNames[targetLanguage] || targetLanguage;
    const sourceLangFull = sourceLang ? (languageNames[sourceLang] || sourceLang) : 'auto-detect';

    const systemPrompt = `You are an expert multilingual translator. Your job is to translate HTML content accurately.

CRITICAL RULES:
1. Translate ALL text content into ${targetLangFull}
2. PRESERVE all HTML tags exactly as they are (<h1>, <h2>, <p>, <ul>, <li>, <a>, <strong>, <em>, <table>, <tr>, <td>, etc.)
3. PRESERVE all HTML attributes (href, class, id, style, etc.) — do NOT translate attribute values
4. PRESERVE all URLs, links, numbers, and code unchanged
5. Keep technical terms, brand names, and proper nouns in their original form
6. Output ONLY the translated HTML — no markdown, no code blocks, no explanations
7. The translation must be natural and fluent, not word-by-word
8. If source language is the same as target language, return the content unchanged`;

    // For large content, process in chunks to avoid token limits
    let contentToTranslate = htmlContent;
    
    // Strip any existing Google Translate artifacts
    contentToTranslate = contentToTranslate
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '')
      .replace(/class="[^"]*notranslate[^"]*"/gi, '')
      .trim();

    let translatedHtml = await generateAIContent(aiConfig, systemPrompt, contentToTranslate, 8000);

    // Clean AI output: remove markdown wrappers
    translatedHtml = translatedHtml
      .replace(/^```html\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Sanity check: if result is too short compared to input, something went wrong
    if (translatedHtml.length < htmlContent.length * 0.3) {
      console.warn('[Translate] Suspiciously short translation output');
    }

    return NextResponse.json({ 
      translatedHtml,
      sourceLang: sourceLangFull,
      targetLang: targetLangFull,
      charCount: translatedHtml.length,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Translation failed. Please try again.',
    }, { status: 500 });
  }
}
