import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, titles, preferredProvider } = body;

    const listToProcess: string[] = [];
    if (title && typeof title === 'string') {
      listToProcess.push(title.trim());
    }
    if (Array.isArray(titles)) {
      titles.forEach((t: string) => {
        if (typeof t === 'string' && t.trim().length > 2) {
          listToProcess.push(t.trim());
        }
      });
    }

    if (listToProcess.length === 0) {
      return NextResponse.json({ error: 'At least one title is required' }, { status: 400 });
    }

    // Fetch site settings and API keys
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let rawApiKey = settings?.aiApiKey || '';
    let savedKeys: Record<string, string> = {};
    try {
      if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
    } catch (e) {}

    const selectedProvider = preferredProvider || settings?.aiProvider || 'gemini';
    const openAiKey = savedKeys.openai || (settings?.aiProvider === 'openai' ? rawApiKey : '') || process.env.OPENAI_API_KEY || '';
    const geminiKey = savedKeys.gemini || (settings?.aiProvider === 'gemini' ? rawApiKey : '') || process.env.GEMINI_API_KEY || '';
    const openRouterKey = savedKeys.openrouter || (settings?.aiProvider === 'openrouter' ? rawApiKey : '') || process.env.OPENROUTER_API_KEY || '';
    const claudeKey = savedKeys.anthropic || (settings?.aiProvider === 'anthropic' ? rawApiKey : '') || process.env.ANTHROPIC_API_KEY || '';
    const groqKey = savedKeys.groq || (settings?.aiProvider === 'groq' ? rawApiKey : '') || process.env.GROQ_API_KEY || '';

    const aiConfig: AIConfig = {
      provider: selectedProvider as any,
      model: settings?.aiModel || 'gemini-2.5-flash',
      apiKey: geminiKey || openAiKey || openRouterKey || claudeKey || groqKey,
      openAiKey,
      geminiKey,
      openRouterKey,
      claudeKey,
      groqKey,
    };

    const results = [];

    for (const singleTitle of listToProcess.slice(0, 20)) {
      try {
        const systemPrompt = `आप Knowora.in के सीनियर एजुकेशन और जॉब एडिटर हैं। 
दिए गए विषय पर 100% संपूर्ण, विस्तृत, प्रामाणिक और आकर्षक 2000+ शब्दों का हिंदी ब्लॉग लिखें।

आवश्यक संरचना:
1. <h2> परिचय व भर्ती का महत्व
2. <h2> Key Highlights (तालिका: भर्ती बोर्ड, कुल पद, योग्यता, आयु, सैलरी, आधिकारिक वेबसाइट)
3. <h2> पदवार रिक्तियां व जिम्मेदारियां
4. <h2> शैक्षणिक योग्यता और आयु सीमा (छूट सहित)
5. <h2> चयन प्रक्रिया (Selection Stages)
6. <h2> विस्तृत परीक्षा पैटर्न (तालिका: विषय, प्रश्न, अंक, समय)
7. <h2> सैलरी, भत्ते और प्रमोशन के अवसर
8. <h2> 90-दिवसीय वैज्ञानिक तैयारी रणनीति (Phase 1, 2, 3)
9. <h2> मॉक टेस्ट और समय प्रबंधन गाइड (तालिका)
10. <h2> ऑनलाइन आवेदन कैसे करें (स्टेप-बाय-स्टेप गाइड)
11. <h2> 5 गलतियां जिनसे बचना अनिवार्य है
12. <h2> Important Links (तालिका: आधिकारिक पोर्टल, अप्लाई लिंक, नोटिफिकेशन)
13. <h2> FAQs (अक्सर पूछे जाने वाले 5-6 महत्वपूर्ण प्रश्न)
14. <h2> निष्कर्ष

आउटपुट केवल और केवल वैध JSON फॉर्मेट में दें:
{
  "title": "आकर्षक हिंदी शीर्षक",
  "slug": "english-seo-friendly-slug-2026",
  "content": "HTML स्ट्रक्चर्ड ब्लॉग सामग्री (केवल <h2>, <h3>, <p>, <table>, <ul>, <ol>, <strong> का उपयोग करें)",
  "excerpt": "2 लाइनों का आकर्षक सारांश",
  "gridBox": "latestJobs"
}`;

        const userPrompt = `विषय: "${singleTitle}" (कृपया 2026 आधारित संपूर्ण जानकारी लिखें)`;
        const aiResponse = await generateAIContent(systemPrompt, userPrompt, aiConfig);

        let parsed: any = {};
        try {
          const cleanJson = aiResponse.replace(/```json\s*|```\s*$/g, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          parsed = {
            title: singleTitle,
            slug: singleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `job-${Date.now()}`,
            content: aiResponse,
            excerpt: `${singleTitle} भर्ती 2026 की संपूर्ण जानकारी, योग्यता और सिलेबस।`,
            gridBox: 'latestJobs'
          };
        }

        let generatedSlug = parsed.slug || `post-${Date.now()}`;
        const existing = await prisma.blogPost.findUnique({ where: { slug: generatedSlug } });
        if (existing) {
          generatedSlug = `${generatedSlug}-${Date.now().toString().slice(-4)}`;
        }

        const detectedGrid = detectGridBox(parsed.title || singleTitle, parsed.content || '');
        const resolved = resolveOfficialLinks(parsed.title || singleTitle, parsed.content || '');
        const imagePrompt = encodeURIComponent(`${(parsed.title || singleTitle).slice(0, 50)} India modern official high resolution`);
        const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

        const newPost = await prisma.blogPost.create({
          data: {
            title: parsed.title || singleTitle,
            slug: generatedSlug,
            content: resolved.sanitizedContent,
            excerpt: parsed.excerpt || parsed.title || singleTitle,
            featuredImage,
            status: 'Published',
            publishedAt: new Date(),
            gridBox: detectedGrid,
            seoTitle: parsed.title || singleTitle,
            seoDescription: parsed.excerpt || parsed.title || singleTitle,
            seoKeywords: parsed.title || singleTitle,
            officialApplyUrl: resolved.apply,
            autoGenerated: true,
            allowAutoUpdate: false,
          }
        });

        results.push({
          success: true,
          title: newPost.title,
          slug: newPost.slug,
          url: `https://knowora.in/blog/${newPost.slug}`,
          gridBox: newPost.gridBox
        });
      } catch (err: any) {
        results.push({
          success: false,
          title: singleTitle,
          error: err.message
        });
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${results.filter(r => r.success).length} ब्लॉग्स लाइव पब्लिश किए गए!`,
      totalRequested: listToProcess.length,
      publishedCount: results.filter(r => r.success).length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
