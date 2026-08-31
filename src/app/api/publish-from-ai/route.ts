import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SECRET_KEY = 'knowora-secret-2026';

function cleanHtmlToText(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, ' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, 15000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, url, title, content, excerpt, slug, gridBox, officialApplyUrl, jobStates, qualifications } = body;

    // 1. Verify Secret Key
    if (secret !== SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid secret key' }, { status: 401 });
    }

    // 2. MODE A: Automatic URL Processing (Make.com / Zapier / Telegram RSS)
    if (url && (!title || !content)) {
      let scrapedText = '';
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        if (resp.ok) {
          const html = await resp.text();
          scrapedText = cleanHtmlToText(html);
        }
      } catch (e) {}

      if (!scrapedText || scrapedText.length < 50) {
        scrapedText = `URL: ${url} (कृपया इस विषय पर 2026 आधारित संपूर्ण विस्तृत हिंदी ब्लॉग लिखें)`;
      }

      // Fetch AI keys
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      let rawApiKey = settings?.aiApiKey || '';
      let savedKeys: Record<string, string> = {};
      try {
        if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
      } catch (e) {}

      const aiConfigs: AIConfig[] = [];
      const geminiKey = savedKeys['gemini'] || (rawApiKey.startsWith('AIza') ? rawApiKey : '');
      const anthropicKey = savedKeys['anthropic'] || (rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');
      const openrouterKey = savedKeys['openrouter'] || (rawApiKey.startsWith('sk-or-') ? rawApiKey : '');
      const groqKey = savedKeys['groq'] || (rawApiKey.startsWith('gsk_') ? rawApiKey : '');
      const openaiKey = savedKeys['openai'] || (rawApiKey.startsWith('sk-') && !rawApiKey.startsWith('sk-or-') && !rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');

      if (geminiKey) aiConfigs.push({ provider: 'gemini', apiKey: geminiKey, model: 'gemini-2.5-flash' });
      if (openrouterKey) aiConfigs.push({ provider: 'openrouter', apiKey: openrouterKey, model: 'google/gemini-2.5-flash' });
      if (anthropicKey) aiConfigs.push({ provider: 'anthropic', apiKey: anthropicKey, model: 'claude-3-5-sonnet-20241022' });
      if (groqKey) aiConfigs.push({ provider: 'groq', apiKey: groqKey, model: 'llama-3.3-70b-specdec' });
      if (openaiKey) aiConfigs.push({ provider: 'openai', apiKey: openaiKey, model: 'gpt-4o-mini' });

      const sysPrompt = `आप Knowora.in के चीफ एडिटर हैं। 

⚠️ सबसे महत्वपूर्ण नियम (Strict Single Topic Rule):
1. **एक ब्लॉग में केवल और केवल 1 ही भर्ती या 1 ही विषय पर लिखें।** कभी भी कई अलग-अलग भर्तियों (जैसे SSC, रेलवे, पुलिस) को एक ही आर्टिकल में खिचड़ी बनाकर न लिखें!
2. अगर इनपुट में सिर्फ एक भर्ती है, तो शुरुआत से लेकर अंत तक सिर्फ उसी भर्ती के बारे में 2000+ शब्दों का गहन और संपूर्ण आर्टिकल लिखें।
3. वर्ष 2026 होना अनिवार्य है।
4. ग्रिड बॉक्स (gridBox) को विषय के अनुसार सही पहचानें:
   - 'latestJobs' -> चालू भर्ती (Active Application)
   - 'upcomingJobs' -> आगामी भर्ती
   - 'admitCard' -> एडमिट कार्ड / हॉल टिकट / एग्जाम सिटी
   - 'examResults' -> रिजल्ट / कट-ऑफ / आंसर की
   - 'scheme' -> सरकारी योजना / सब्सिडी
   - 'scholarship' -> छात्रवृत्ति
   - 'tech' -> स्मार्टफोन / टेक न्यूज़
   - 'finance' -> बैंकिंग / पेंशन / लोन / FD
5. आर्टिकल में <h2>, विस्तृत <table>, <details> FAQ और निष्कर्ष (<h2 id="conclusion">Conclusion</h2>) शामिल होना अनिवार्य है।
6. आउटपुट केवल शुद्ध JSON में दें।`;

      const userPrompt = `दिए गए संदर्भ से ब्लॉग पोस्ट तैयार करें:
URL: ${url}
डेटा: ${scrapedText.slice(0, 8000)}

केवल इस JSON प्रारूप में उत्तर दें:
{
  "title": "आकर्षक, 2026 वर्ष युक्त पूर्ण हिंदी शीर्षक",
  "slug": "unique-english-slug-2026",
  "gridBox": "latestJobs" | "upcomingJobs" | "admitCard" | "examResults" | "scheme" | "scholarship" | "university" | "tech" | "finance" | "learning" | "news",
  "excerpt": "2-3 पंक्तियों का आकर्षक हिंदी सारांश",
  "seoTitle": "SEO Friendly Title (under 60 chars)",
  "seoDescription": "Meta Description (under 160 chars)",
  "seoKeywords": "Keyword 1, Keyword 2 2026",
  "jobStates": ["All India"],
  "qualifications": ["10th Pass"],
  "officialApplyUrl": "${url}",
  "content": "<h2>हेडिंग</h2><p>विवरण...</p><table>...</table><h2>Important Links</h2><table>...</table><h2>FAQ</h2><details><summary>...</summary><p>...</p></details><h2 id=\"conclusion\">Conclusion</h2><p>...</p>"
}`;

      const rawResponse = await generateAIContent(aiConfigs, sysPrompt, userPrompt, 8000, true);

      let jsonStr = rawResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const postData = JSON.parse(jsonStr);

      const imagePrompt = encodeURIComponent(`${postData.title.slice(0, 50)} India modern official high resolution`);
      const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

      let baseSlug = (postData.slug || `post-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      const existing = await prisma.blogPost.findUnique({ where: { slug: baseSlug } });
      if (existing) baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const newPost = await prisma.blogPost.create({
        data: {
          title: postData.title,
          slug: baseSlug,
          content: postData.content,
          excerpt: postData.excerpt,
          featuredImage,
          status: 'Published',
          publishedAt: new Date(),
          gridBox: postData.gridBox || detectGridBox(postData.title, postData.content),
          seoTitle: postData.seoTitle || postData.title,
          seoDescription: postData.seoDescription || postData.excerpt,
          seoKeywords: postData.seoKeywords || '',
          jobStates: postData.jobStates || [],
          qualifications: postData.qualifications || [],
          officialApplyUrl: postData.officialApplyUrl || url,
          autoGenerated: true,
          allowAutoUpdate: false,
        }
      });

      try {
        revalidatePath('/', 'layout');
        revalidatePath('/blog', 'layout');
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Blog scraped, written by AI and published successfully!',
        url: `https://knowora.in/blog/${newPost.slug}`,
        id: newPost.id,
        title: newPost.title
      });
    }

    // 3. MODE B: Direct Content Submission (from ChatGPT / Claude Custom GPT)
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!finalSlug) finalSlug = `blog-${Date.now()}`;

    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const imagePrompt = encodeURIComponent(`${title.slice(0, 50)} India modern official high resolution`);
    const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

    const resolved = resolveOfficialLinks(title, content);
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: finalSlug,
        content: resolved.sanitizedContent,
        excerpt: excerpt || title,
        featuredImage,
        status: 'Published',
        publishedAt: new Date(),
        gridBox: gridBox || 'latestJobs',
        seoTitle: title,
        seoDescription: excerpt || title,
        seoKeywords: title,
        jobStates: jobStates || [],
        qualifications: qualifications || [],
        officialApplyUrl: officialApplyUrl || resolved.apply,
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
      message: 'Blog published successfully from AI!',
      url: `https://knowora.in/blog/${post.slug}`,
      id: post.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
