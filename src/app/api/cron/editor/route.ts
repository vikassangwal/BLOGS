import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

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

    return POST(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch configurations
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!siteSettings) throw new Error("Site settings not found");

    let apiKeys: any = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { apiKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    // Agent 8 Configuration
    const provider = apiKeys.editorProvider || 'openrouter';
    const model = (apiKeys.editorModel || 'openai/gpt-4o-mini').trim();
    const maxTokens = parseInt(apiKeys.editorTokens) || 4000;
    
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

    const editorConfig = { provider: provider as any, apiKey: getApiKey(provider), model, maxTokens };

    // 2. Find a published post that hasn't been QA checked
    const uncheckedPost = await prisma.blogPost.findFirst({
      where: { 
        status: 'Published',
        content: { not: { contains: '<!-- QA_CHECKED -->' } }
      },
      orderBy: { publishedAt: 'desc' }
    });

    if (!uncheckedPost) {
      return NextResponse.json({ status: 'skip', message: 'All posts have been quality checked.' });
    }

    // 3. AI Editor Prompt
    const sysPrompt = "You are an Elite SEO Editor and Quality Assurance Expert. Return ONLY a valid JSON object. Do not use markdown blocks.";
    const userPrompt = `Review the following blog post data. Fix any formatting errors, ensure SEO keywords are naturally integrated, make the title very catchy (clickbait but factual), and ensure paragraphs are short and readable.

Current Title: ${uncheckedPost.title}
Current SEO Title: ${uncheckedPost.seoTitle}
Current SEO Description: ${uncheckedPost.seoDescription}

Content (HTML):
${uncheckedPost.content}

Instructions:
1. IMPROVE TITLE: Make the title highly engaging, punchy, and irresistible (clickbait but factual).
2. RUTHLESS CRITIC (BAN LIST): Scan the content and completely DELETE these words/phrases if found: "In conclusion", "Moreover", "Delve into", "Navigating the complexities", "Let's explore", "Today we will discuss", "Welcome to our blog", "It is important to note", "A testament to", "Tapestry", "Crucial", "Vital", "This article will", "आज के इस आर्टिकल में हम जानेंगे", "तो चलिए शुरू करते हैं", "आप सभी का स्वागत है".
3. NO FILLER: Delete introductory fluff. Ensure the first paragraph hits the main point immediately like a top-tier journalist.
4. FIX FORMATTING: Fix any broken HTML tags. Ensure data is in <table>.
5. APPEND the exact string "<!-- QA_CHECKED -->" to the very end of the HTML content so I know it has been checked.
5. Return a JSON object with this exact structure:
{
  "newTitle": "...",
  "newSeoTitle": "...",
  "newSeoDescription": "...",
  "newContent": "..."
}
Respond ONLY with the JSON.`;

    let aiResponse;
    try {
      aiResponse = await generateAIContent(editorConfig, sysPrompt, userPrompt, editorConfig.maxTokens);
    } catch (error) {
      console.warn("Primary Editor Model failed, attempting fallback...");
      const backupStr = apiKeys.editorBackupModel?.trim();
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
    
    // Parse the JSON
    let parsedData;
    try {
      const cleanJson = aiResponse.replace(/^```json\n?|```$/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse editor JSON response", aiResponse);
      // Fallback: just append the tag to prevent looping over the same post
      await prisma.blogPost.update({
        where: { id: uncheckedPost.id },
        data: { content: uncheckedPost.content + '\n<!-- QA_CHECKED -->' }
      });
      return NextResponse.json({ status: 'error', message: 'Failed to parse AI JSON. Marked post as checked to prevent loop.' });
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
