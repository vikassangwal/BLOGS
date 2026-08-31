import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BOT_TOKEN = '8992341130:AAGEHTJ733xYb_W3R_vfRePSfCsKfceWBuw';

async function sendTelegramMessage(chatId: number | string, text: string) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
  } catch (e) {
    console.error('Failed to send Telegram message:', e);
  }
}

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
    const update = await request.json();
    const message = update?.message || update?.channel_post;
    const text = message?.text || message?.caption || '';
    const chatId = message?.chat?.id;

    if (!text || !chatId) {
      return NextResponse.json({ ok: true });
    }

    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        '👋 <b>नमस्ते! मैं Knowora AI (ChatGPT & Gemini) Blog Publisher Bot हूँ।</b>\n\nमुझे कोई भी <b>वेबसाइट लिंक (URL)</b> या <b>सरकारी भर्ती / न्यूज़ का नाम</b> भेजें (जैसे: <i>SSC GD 2026</i> या <i>Railway NTPC</i>) — मैं तुरंत पूरा 2000+ शब्दों का ब्लॉग लिखकर <a href="https://www.knowora.in">Knowora.in</a> पर लाइव पब्लिश कर दूँगा!'
      );
      return NextResponse.json({ ok: true });
    }

    // Acknowledge receipt to user
    await sendTelegramMessage(
      chatId,
      '⏳ <b>आपकी खबर मिल गई है!</b>\nChatGPT / Gemini AI से 2000+ शब्दों का संपूर्ण हिंदी ब्लॉग, टेबल्स व असली सरकारी लिंक्स तैयार किए जा रहे हैं... (कृपया 10-15 सेकंड प्रतीक्षा करें)'
    );

    // 1. Check if input contains URL
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    let scrapedText = '';
    let targetUrl = urlMatch ? urlMatch[0] : '';

    if (targetUrl) {
      try {
        const resp = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        if (resp.ok) {
          const html = await resp.text();
          scrapedText = cleanHtmlToText(html);
        }
      } catch (e) {}
    }

    if (!scrapedText || scrapedText.length < 50) {
      scrapedText = `विषय / खबर: ${text} (कृपया इस पर 2026 का 100% संपूर्ण, गहन और विस्तृत हिंदी ब्लॉग तैयार करें)`;
    }

    // 2. Fetch AI keys
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let rawApiKey = settings?.aiApiKey || '';
    let savedKeys: Record<string, string> = {};
    try {
      if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
    } catch (e) {}

    const aiConfigs: AIConfig[] = [];
    const openaiKey = savedKeys['openai'] || (rawApiKey.startsWith('sk-') && !rawApiKey.startsWith('sk-or-') && !rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');
    const geminiKey = savedKeys['gemini'] || (rawApiKey.startsWith('AIza') ? rawApiKey : '');
    const anthropicKey = savedKeys['anthropic'] || (rawApiKey.startsWith('sk-ant-') ? rawApiKey : '');
    const openrouterKey = savedKeys['openrouter'] || (rawApiKey.startsWith('sk-or-') ? rawApiKey : '');
    const groqKey = savedKeys['groq'] || (rawApiKey.startsWith('gsk_') ? rawApiKey : '');

    if (openaiKey) aiConfigs.push({ provider: 'openai', apiKey: openaiKey, model: 'gpt-4o-mini' });
    if (geminiKey) aiConfigs.push({ provider: 'gemini', apiKey: geminiKey, model: 'gemini-2.5-flash' });
    if (openrouterKey) aiConfigs.push({ provider: 'openrouter', apiKey: openrouterKey, model: 'google/gemini-2.5-flash' });
    if (anthropicKey) aiConfigs.push({ provider: 'anthropic', apiKey: anthropicKey, model: 'claude-3-5-sonnet-20241022' });
    if (groqKey) aiConfigs.push({ provider: 'groq', apiKey: groqKey, model: 'llama-3.3-70b-specdec' });

    const sysPrompt = `आप Knowora.in के चीफ एडिटर हैं। 

⚠️ सबसे महत्वपूर्ण नियम (Strict Single Topic Rule):
1. **एक ब्लॉग में केवल और केवल 1 ही भर्ती या 1 ही विषय पर लिखें।** कभी भी कई अलग-अलग भर्तियों को मिक्स न करें!
2. वर्ष 2026 अनिवार्य है।
3. ग्रिड बॉक्स (gridBox) को विषय के अनुसार सही पहचानें ('latestJobs' | 'upcomingJobs' | 'admitCard' | 'examResults' | 'scheme' | 'scholarship' | 'university' | 'tech' | 'finance' | 'learning' | 'news')
4. <h2>, विस्तृत <table>, <details> FAQ और निष्कर्ष (<h2 id="conclusion">Conclusion</h2>) शामिल होना अनिवार्य है।
5. आउटपुट केवल शुद्ध JSON में दें।`;

    const userPrompt = `दिए गए विषय/खबर से 2026 हिंदी ब्लॉग पोस्ट तैयार करें:
इनपुट: ${text}
डेटा: ${scrapedText.slice(0, 8000)}

केवल इस JSON प्रारूप में उत्तर दें:
{
  "title": "आकर्षक, 2026 वर्ष युक्त पूर्ण हिंदी शीर्षक",
  "slug": "unique-english-keyword-slug-2026",
  "gridBox": "latestJobs" | "upcomingJobs" | "admitCard" | "examResults" | "scheme" | "scholarship" | "university" | "tech" | "finance" | "learning" | "news",
  "excerpt": "2-3 पंक्तियों का आकर्षक हिंदी सारांश",
  "seoTitle": "SEO Friendly Title (under 60 chars)",
  "seoDescription": "Meta Description (under 160 chars)",
  "seoKeywords": "Keyword 1, Keyword 2 2026",
  "jobStates": ["All India"],
  "qualifications": ["10th Pass"],
  "officialApplyUrl": "आधिकारिक वेबसाइट लिंक",
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

    const resolved = resolveOfficialLinks(postData.title, postData.content);
    const finalGrid = postData.gridBox || detectGridBox(postData.title, postData.content);

    const newPost = await prisma.blogPost.create({
      data: {
        title: postData.title,
        slug: baseSlug,
        content: resolved.sanitizedContent,
        excerpt: postData.excerpt,
        featuredImage,
        status: 'Published',
        publishedAt: new Date(),
        gridBox: finalGrid,
        seoTitle: postData.seoTitle || postData.title,
        seoDescription: postData.seoDescription || postData.excerpt,
        seoKeywords: postData.seoKeywords || '',
        jobStates: postData.jobStates || [],
        qualifications: postData.qualifications || [],
        officialApplyUrl: resolved.apply || targetUrl || null,
        autoGenerated: false,
        allowAutoUpdate: false,
      }
    });

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    const liveUrl = `https://www.knowora.in/blog/${newPost.slug}`;

    await sendTelegramMessage(
      chatId,
      `🎉 <b>ब्लॉग सफलतापूर्वक पब्लिश हो गया!</b>\n\n📌 <b>शीर्षक:</b> ${newPost.title}\n\n📂 <b>ग्रिड श्रेणी:</b> ${newPost.gridBox}\n🔗 <b>लाइव लिंक:</b> <a href="${liveUrl}">${liveUrl}</a>\n\n✅ <i>यह आर्टिकल Knowora.in के होमपेज पर तुरंत दिखने लगा है!</i>`
    );

    return NextResponse.json({ ok: true, post: newPost });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
