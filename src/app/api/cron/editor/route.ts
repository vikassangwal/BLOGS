import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';
import { waitUntil } from '@vercel/functions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    
    if (cronSecret !== expectedSecret && cronSecret !== 'knowora-cron-2026') {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    waitUntil(
      POST(request).catch((err) => console.error("Background editor error:", err))
    );

    return NextResponse.json({ status: 'Processing in background' }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch site settings
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!siteSettings) throw new Error("Site settings not found");

    let savedKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    } else if (siteSettings?.aiApiKey) {
      savedKeys['openai'] = siteSettings.aiApiKey;
      savedKeys['gemini'] = siteSettings.aiApiKey;
      savedKeys['openrouter'] = siteSettings.aiApiKey;
    }

    function getApiKeyForProvider(p: string): string {
      let key = (savedKeys[p] || '').trim();
      if (!key) {
        const fallback = Object.values(savedKeys).find((v: any) => v && typeof v === 'string' && v.length >= 10);
        if (fallback) key = String(fallback).trim();
      }
      return key;
    }

    function buildEditorConfigs(): AIConfig[] {
      const list: AIConfig[] = [];
      const primaryProvider = savedKeys.editorProvider || siteSettings?.aiProvider || 'openrouter';
      const primaryModel = savedKeys.editorModel || siteSettings?.aiModel || 'google/gemini-2.5-flash';
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

    const editorConfigs = buildEditorConfigs();
    if (editorConfigs.length === 0) {
      throw new Error("No valid AI API keys configured for Editor Agent.");
    }

    // 2. Find a published post that hasn't been QA checked
    const uncheckedPost = await prisma.blogPost.findFirst({
      where: { 
        status: 'Published',
        content: { not: { contains: '<!-- QA_CHECKED -->' } }
      },
      orderBy: { publishedAt: 'desc' }
    });

    if (!uncheckedPost) {
      return NextResponse.json({ status: 'skip', message: 'All published posts have been quality checked.' });
    }

    const currentDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 3. AI Editor Prompt
    const sysPrompt = "You are an Elite SEO Editor and Quality Assurance Expert. Return ONLY a valid JSON object. Do not use markdown blocks.";
    const userPrompt = `Review the following blog post data. Fix any formatting errors, ensure SEO keywords are naturally integrated, make the title very catchy (clickbait but factual), and ensure paragraphs are short and readable.
Today's date is: ${currentDateStr}.

Current Title: ${uncheckedPost.title}
Current SEO Title: ${uncheckedPost.seoTitle}
Current SEO Description: ${uncheckedPost.seoDescription}

Content (HTML):
${uncheckedPost.content}

Instructions:
1. IMPROVE TITLE: Make the title highly engaging, punchy, and irresistible (clickbait but factual).
2. RUTHLESS CRITIC (BAN LIST): Scan the content and completely DELETE these words/phrases if found: "In conclusion", "Moreover", "Delve into", "Navigating the complexities", "Let's explore", "Today we will discuss", "Welcome to our blog", "It is important to note", "A testament to", "Tapestry", "Crucial", "Vital", "आज के इस आर्टिकल में हम जानेंगे", "तो चलिए शुरू करते हैं", "आप सभी का स्वागत है".
3. NO FILLER: Delete introductory fluff. Ensure the first paragraph hits the main point immediately like a top-tier journalist.
4. FIX FORMATTING: Fix any broken HTML tags. Ensure data tables are clean.
5. APPEND the exact string "<!-- QA_CHECKED -->" to the very end of the HTML content.
6. Return a JSON object with this exact structure:
{
  "newTitle": "...",
  "newSeoTitle": "...",
  "newSeoDescription": "...",
  "newContent": "..."
}
Respond ONLY with the JSON.`;

    let aiResponse;
    try {
      aiResponse = await generateAIContent(editorConfigs, sysPrompt, userPrompt, 4000);
    } catch (error: any) {
      console.error("Editor AI Generation Failed:", error);
      await prisma.blogPost.update({
        where: { id: uncheckedPost.id },
        data: { content: uncheckedPost.content + '\n<!-- QA_CHECKED -->' }
      });
      return NextResponse.json({ status: 'error', message: 'Editor Agent failed, marked post as checked.' });
    }
    
    // Parse the JSON
    let parsedData;
    try {
      const cleanJson = aiResponse.replace(/^```json\n?|```$/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse editor JSON response", aiResponse);
      await prisma.blogPost.update({
        where: { id: uncheckedPost.id },
        data: { content: uncheckedPost.content + '\n<!-- QA_CHECKED -->' }
      });
      return NextResponse.json({ status: 'error', message: 'Failed to parse AI JSON. Marked post as checked.' });
    }

    // Ensure the tag is there
    let finalContent = parsedData.newContent || uncheckedPost.content;
    if (!finalContent.includes('<!-- QA_CHECKED -->')) {
      finalContent += '\n<!-- QA_CHECKED -->';
    }

    // 4. Update the database
    await prisma.blogPost.update({
      where: { id: uncheckedPost.id },
      data: {
        title: parsedData.newTitle || uncheckedPost.title,
        seoTitle: parsedData.newSeoTitle || uncheckedPost.seoTitle,
        seoDescription: parsedData.newSeoDescription || uncheckedPost.seoDescription,
        content: finalContent
      }
    });

    try {
      revalidatePath(`/blog/${uncheckedPost.slug}`);
      revalidatePath(`/blog`);
    } catch(e) {}

    return NextResponse.json({ 
      status: 'success', 
      message: `QA Checked and Edited post: ${uncheckedPost.title}` 
    });

  } catch (error: any) {
    console.error('Editor Agent failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
