import { NextResponse } from 'next/server';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(ip, 5, 60000); // 5 requests per minute
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const { htmlContent, targetLanguage } = await request.json();

    if (!htmlContent || !targetLanguage) {
      return NextResponse.json({ error: 'Missing content or language' }, { status: 400 });
    }

    if (htmlContent.length > 50000) {
      return NextResponse.json({ error: 'Content too large (max 50,000 characters)' }, { status: 413 });
    }

    const aiConfig = await getAIConfig();
    if (!aiConfig) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
    }

    const prompt = `You are a professional translator. Translate the following HTML content into ${targetLanguage}. Maintain all HTML tags and formatting exactly as they are. Only return the translated HTML string without any markdown code blocks.`;

    // Limit content size to avoid context limits if needed, but modern models handle it
    let translatedHtml = await generateAIContent(aiConfig, prompt, htmlContent, 4000);

    // Strip markdown formatting if AI added it
    translatedHtml = translatedHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

    return NextResponse.json({ translatedHtml });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
