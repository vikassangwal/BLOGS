import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToWhatsApp, postToTelegram } from '@/lib/social-sharing';

export const maxDuration = 60; // 60 seconds maximum duration
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    const isCronCall = expectedSecret && (
      request.headers.get('x-cron-secret') === expectedSecret || 
      authHeader === `Bearer ${expectedSecret}` ||
      new URL(request.url).searchParams.get('secret') === expectedSecret
    );
    
    if (!isCronCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch site settings and API credentials
    const [siteSettings, settings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } })
    ]);

    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    const whatsappToken = savedKeys.whatsappToken || settings?.whatsappToken;
    const whatsappPhoneId = savedKeys.whatsappPhoneId || settings?.whatsappPhoneId;
    const whatsappGroupId = savedKeys.whatsappGroupId || settings?.whatsappGroupId;
    const telegramToken = savedKeys.telegramToken || settings?.telegramToken;
    const telegramChatId = savedKeys.telegramChatId || settings?.telegramChatId;

    // Fetch up to 10 published posts that are not yet shared on social media
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        socialShared: false
      },
      orderBy: {
        publishedAt: 'asc'
      },
      take: 10
    });

    if (posts.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending blog posts to digest.' });
    }

    // Build the consolidated digest message
    const dateStr = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let caption = `📢 <b>Knowora दैनिक जॉब बुलेटिन - ${dateStr}</b>\n`;
    caption += `आज के 10 महत्वपूर्ण सरकारी भर्ती, एडमिट कार्ड और परिणाम अपडेट्स:\n\n`;

    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    posts.forEach((post, index) => {
      const numPrefix = emojiNumbers[index] || `${index + 1}.`;
      caption += `${numPrefix} <b>${post.title}</b>\n`;
      caption += `👉 <a href="https://www.knowora.in/blog/${post.slug}">यहाँ क्लिक करके पढ़ें</a>\n\n`;
    });

    caption += `📲 सरकारी नौकरी और परीक्षा अपडेट तुरंत पाने के लिए हमारे ग्रुप्स से जुड़ें!\n`;
    caption += `🔹 <b>टेलीग्राम चैनल:</b> t.me/knowora\n`;
    if (whatsappGroupId) {
      caption += `🔹 <b>व्हाट्सएप ग्रुप:</b> knowora.in/whatsapp\n`;
    }
    caption += `\n#SarkariJob #GovtJobs #Knowora #JobAlert`;

    // Select the first valid featured image as the digest banner, or fallback to site logo
    const bannerImage = posts.find(p => p.featuredImage)?.featuredImage || 'https://www.knowora.in/logo-banner.png';

    const broadcastResults: { telegram?: boolean; whatsapp?: boolean } = {};

    // 1. Broadcast to Telegram
    if (telegramToken && telegramChatId) {
      broadcastResults.telegram = await postToTelegram(telegramToken, telegramChatId, caption, bannerImage);
    }

    // 2. Broadcast to WhatsApp
    if (whatsappToken && whatsappPhoneId && whatsappGroupId) {
      broadcastResults.whatsapp = await postToWhatsApp(whatsappToken, whatsappPhoneId, whatsappGroupId, caption, bannerImage);
    }

    // Mark these posts as shared in the database
    const postIds = posts.map(p => p.id);
    await prisma.blogPost.updateMany({
      where: {
        id: { in: postIds }
      },
      data: {
        socialShared: true
      }
    });

    return NextResponse.json({
      success: true,
      sharedCount: posts.length,
      broadcastResults,
      sharedPosts: posts.map(p => p.title)
    });

  } catch (error: any) {
    console.error('[CRON Social Digest Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
