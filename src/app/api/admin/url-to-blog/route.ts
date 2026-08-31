import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function cleanHtmlToText(html: string): string {
  // Remove scripts, styles, svg
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

  // Replace br and p with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  // Strip all other tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim().slice(0, 15000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, preferredProvider, customModel, customInstructions } = body;

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'मान्य URL (वेबसाइट लिंक) देना अनिवार्य है।' }, { status: 400 });
    }

    // 1. Scrape the target URL
    let scrapedText = '';
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (resp.ok) {
        const html = await resp.text();
        scrapedText = cleanHtmlToText(html);
      }
    } catch (e: any) {
      console.warn('Scraping warning:', e.message);
    }

    if (!scrapedText || scrapedText.length < 50) {
      scrapedText = `URL: ${url} (कृपया इस लिंक और इसके विषय पर संपूर्ण 2026 आधारित विस्तृत गाइड लिखें)`;
    }

    // 2. Fetch API Keys and Model Settings from SiteSettings / AutoBlogSettings
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const autoSettings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });

    let rawApiKey = settings?.aiApiKey || '';
    let savedKeys: Record<string, string> = {};
    try {
      if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
    } catch (e) {}

    const aiConfigs: AIConfig[] = [];

    // Prioritize chosen provider (Gemini / Claude / OpenRouter / Groq / OpenAI)
    const geminiKey = savedKeys['gemini'] || (rawApiKey.startsWith('AIza') ? rawApiKey : '');
    const anthropicKey = savedKeys['anthropic'] || (rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');
    const openrouterKey = savedKeys['openrouter'] || (rawApiKey.startsWith('sk-or-') ? rawApiKey : '');
    const groqKey = savedKeys['groq'] || (rawApiKey.startsWith('gsk_') ? rawApiKey : '');
    const openaiKey = savedKeys['openai'] || (rawApiKey.startsWith('sk-') && !rawApiKey.startsWith('sk-or-') && !rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');

    if (preferredProvider === 'gemini' && geminiKey) {
      aiConfigs.push({ provider: 'gemini', apiKey: geminiKey, model: customModel || 'gemini-2.5-flash' });
    } else if (preferredProvider === 'anthropic' && anthropicKey) {
      aiConfigs.push({ provider: 'anthropic', apiKey: anthropicKey, model: customModel || 'claude-3-5-sonnet-20241022' });
    } else if (preferredProvider === 'openrouter' && openrouterKey) {
      aiConfigs.push({ provider: 'openrouter', apiKey: openrouterKey, model: customModel || 'google/gemini-2.5-flash' });
    }

    // Fallbacks
    if (geminiKey) aiConfigs.push({ provider: 'gemini', apiKey: geminiKey, model: 'gemini-2.5-flash' });
    if (openrouterKey) aiConfigs.push({ provider: 'openrouter', apiKey: openrouterKey, model: 'google/gemini-2.5-flash' });
    if (anthropicKey) aiConfigs.push({ provider: 'anthropic', apiKey: anthropicKey, model: 'claude-3-5-sonnet-20241022' });
    if (groqKey) aiConfigs.push({ provider: 'groq', apiKey: groqKey, model: 'llama-3.3-70b-specdec' });
    if (openaiKey) aiConfigs.push({ provider: 'openai', apiKey: openaiKey, model: 'gpt-4o-mini' });

    const sysPrompt = `आप Knowora.in के चीफ एडिटोरियल ऑफिसर हैं। आपको दिए गए वेबपेज/न्यूज़ लिंक के डेटा के आधार पर एक 100% संपूर्ण, उच्च-गुणवत्तापूर्ण, तथ्यात्मक और आकर्षक हिंदी ब्लॉग आर्टिकल लिखना है।

नियम:
1. वर्ष अनिवार्य रूप से 2026 होना चाहिए।
2. कोई क्लिकबेट, फर्जी दावे या ड्राफ्ट नहीं होना चाहिए।
3. आर्टिकल में <h2>, <table>, <ul>, <details> FAQ और निष्कर्ष (<h2 id="conclusion">Conclusion</h2>) शामिल होना अनिवार्य है।
4. आउटपुट केवल शुद्ध JSON में दें।`;

    const userPrompt = `दिए गए संदर्भ से ब्लॉग पोस्ट तैयार करें:
URL: ${url}
वेबपेज से प्राप्त डेटा:
${scrapedText.slice(0, 8000)}

${customInstructions ? 'अतिरिक्त निर्देश: ' + customInstructions : ''}

कृपया केवल इस JSON प्रारूप में उत्तर दें (बिना किसी अतिरिक्त टेक्स्ट के):
{
  "title": "आकर्षक, 2026 वर्ष युक्त पूर्ण हिंदी शीर्षक",
  "slug": "unique-english-seo-slug-2026",
  "gridBox": "latestJobs" | "upcomingJobs" | "admitCard" | "examResults" | "scheme" | "scholarship" | "university" | "tech" | "finance" | "learning" | "news",
  "excerpt": "2-3 पंक्तियों का आकर्षक हिंदी सारांश (150-200 अक्षर)",
  "seoTitle": "SEO Friendly Title (under 60 chars)",
  "seoDescription": "Meta Description with keywords (under 160 chars)",
  "seoKeywords": "Keyword 1, Keyword 2, Keyword 3 2026",
  "jobStates": ["Rajasthan"] या ["All India"] या [],
  "qualifications": ["10th Pass"] या ["Graduate"] या [],
  "officialApplyUrl": "आधिकारिक वेबसाइट लिंक या ${url}",
  "content": "<h2>मुख्य हेडिंग</h2><p>विस्तृत विवरण...</p><table>...</table><h2>Important Links</h2><table>...</table><h2>FAQ</h2><details><summary>...</summary><p>...</p></details><h2 id=\"conclusion\">Conclusion</h2><p>...</p>"
}`;

    const rawResponse = await generateAIContent(aiConfigs, sysPrompt, userPrompt, 8000, true);

    // Clean json
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const postData = JSON.parse(jsonStr);

    // Generate matching image
    const imagePrompt = encodeURIComponent(`${postData.title.slice(0, 50)} India modern official high resolution`);
    const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

    // Save to Database
    let baseSlug = postData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const existing = await prisma.blogPost.findUnique({ where: { slug: baseSlug } });
    if (existing) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newPost = await prisma.blogPost.create({
      data: {
        title: postData.title,
        slug: baseSlug,
        content: postData.content,
        excerpt: postData.excerpt,
        featuredImage,
        status: 'Published',
        publishedAt: new Date(),
        gridBox: postData.gridBox || 'latestJobs',
        seoTitle: postData.seoTitle || postData.title,
        seoDescription: postData.seoDescription || postData.excerpt,
        seoKeywords: postData.seoKeywords || '',
        jobStates: postData.jobStates || [],
        qualifications: postData.qualifications || [],
        officialApplyUrl: postData.officialApplyUrl || url,
        autoGenerated: false,
        allowAutoUpdate: false,
      }
    });

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: '🎉 ब्लॉग सफलतापूर्वक तैयार कर पब्लिश कर दिया गया है!',
      post: {
        id: newPost.id,
        title: newPost.title,
        slug: newPost.slug,
        url: `https://knowora.in/blog/${newPost.slug}`,
        gridBox: newPost.gridBox
      }
    });

  } catch (error: any) {
    console.error('URL to Blog Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate blog from URL' }, { status: 500 });
  }
}
