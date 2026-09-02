import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.secret !== 'knowora-secret-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all short posts (< 1000 words)
    const allPosts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: 'desc' }
    });

    const shortPosts = allPosts.filter(p => {
      const words = (p.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      return words < 1200;
    }).slice(0, 15); // Process in batches of 15

    // Fetch site settings and API keys
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let rawApiKey = settings?.aiApiKey || '';
    let savedKeys: Record<string, string> = {};
    try {
      if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
    } catch (e) {}

    const selectedProvider = 'gemini';
    const openAiKey = savedKeys.openai || (settings?.aiProvider === 'openai' ? rawApiKey : '') || process.env.OPENAI_API_KEY || '';
    const geminiKey = savedKeys.gemini || (settings?.aiProvider === 'gemini' ? rawApiKey : '') || process.env.GEMINI_API_KEY || '';
    const openRouterKey = savedKeys.openrouter || (settings?.aiProvider === 'openrouter' ? rawApiKey : '') || process.env.OPENROUTER_API_KEY || '';
    const claudeKey = savedKeys.anthropic || (settings?.aiProvider === 'anthropic' ? rawApiKey : '') || process.env.ANTHROPIC_API_KEY || '';
    const groqKey = savedKeys.groq || (settings?.aiProvider === 'groq' ? rawApiKey : '') || process.env.GROQ_API_KEY || '';

    const aiConfig: AIConfig = {
      provider: selectedProvider as any,
      model: 'gemini-2.5-flash',
      apiKey: geminiKey || openAiKey || openRouterKey || claudeKey || groqKey,
      openAiKey,
      geminiKey,
      openRouterKey,
      claudeKey,
      groqKey,
    };

    const upgraded = [];

    for (const post of shortPosts) {
      try {
        const systemPrompt = `आप Knowora.in के चीफ एडिटर हैं। 
दिए गए शीर्षक पर 100% संपूर्ण, विस्तृत, प्रामाणिक और आकर्षक 2000+ शब्दों का हिंदी मास्टर ब्लॉग लिखें।

संरचना:
1. <h2> परिचय व मुख्य अपडेट
2. <h2> Key Highlights (तालिका: संस्था, कुल पद, तिथियां, वेतन, आधिकारिक वेबसाइट)
3. <h2> पदवार रिक्तियां व जिम्मेदारियां
4. <h2> शैक्षणिक योग्यता और आयु सीमा (छूट सहित तालिका)
5. <h2> चयन प्रक्रिया (Selection Stages)
6. <h2> विस्तृत परीक्षा पैटर्न (तालिका: विषय, प्रश्न, अंक, समय)
7. <h2> सैलरी, भत्ते और प्रमोशन
8. <h2> 90-दिवसीय तैयारी रणनीति (Phase 1, 2, 3)
9. <h2> मॉक टेस्ट और समय प्रबंधन तालिका
10. <h2> ऑनलाइन आवेदन कैसे करें (स्टेप-बाय-स्टेप गाइड)
11. <h2> 5 गलतियां जिनसे बचना अनिवार्य है
12. <h2> Important Links (तालिका: आधिकारिक पोर्टल, अप्लाई लिंक, नोटिफिकेशन)
13. <h2> FAQs (अक्सर पूछे जाने वाले 5-8 प्रश्न <details> में)
14. <h2> निष्कर्ष

आउटपुट केवल और केवल वैध JSON फॉर्मेट में दें:
{
  "title": "${post.title}",
  "content": "HTML सामग्री (केवल <h2>, <h3>, <p>, <table>, <ul>, <ol>, <strong>, <details>, <summary>)",
  "excerpt": "2 लाइनों का आकर्षक सारांश"
}`;

        const userPrompt = `विषय: "${post.title}" (कृपया 2026 आधारित संपूर्ण जानकारी लिखें)`;
        const aiResponse = await generateAIContent(systemPrompt, userPrompt, aiConfig);

        let parsed: any = {};
        try {
          const cleanJson = aiResponse.replace(/```json\s*|```\s*$/g, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          parsed = {
            title: post.title,
            content: aiResponse,
            excerpt: post.excerpt || post.title
          };
        }

        const detectedGrid = detectGridBox(parsed.title || post.title, parsed.content || '');
        const resolved = resolveOfficialLinks(parsed.title || post.title, parsed.content || '');

        const updatedPost = await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            content: resolved.sanitizedContent,
            excerpt: parsed.excerpt || post.excerpt || post.title,
            gridBox: detectedGrid,
            officialApplyUrl: resolved.apply,
            updatedAt: new Date(),
          }
        });

        upgraded.push({
          id: updatedPost.id,
          title: updatedPost.title,
          slug: updatedPost.slug,
          words: updatedPost.content.split(/\s+/).length
        });
      } catch (err: any) {
        console.error('Error upgrading post:', post.title, err.message);
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${upgraded.length} ब्लॉग्स को 2000+ शब्दों में पूरा और विस्तृत कर दिया गया!`,
      upgradedCount: upgraded.length,
      upgraded
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
