import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
    const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        socialShared: false
      },
      orderBy: { publishedAt: 'desc' }
    });

    return NextResponse.json({ success: true, posts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
    const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { text, imageUrl, postIds, markAsSharedOnly } = body;

    if (markAsSharedOnly) {
      if (postIds && Array.isArray(postIds) && postIds.length > 0) {
        await prisma.blogPost.updateMany({
          where: {
            id: { in: postIds }
          },
          data: {
            socialShared: true
          }
        });
      }
      return NextResponse.json({ success: true, message: 'Posts marked as shared successfully.' });
    }

    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
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

    const broadcastResults: { telegram?: boolean; whatsapp?: boolean } = {};

    const { postToWhatsApp, postToTelegram } = await import('@/lib/social-sharing');

    // 1. Broadcast to Telegram
    if (telegramToken && telegramChatId) {
      broadcastResults.telegram = await postToTelegram(telegramToken, telegramChatId, text, imageUrl);
    }

    // 2. Broadcast to WhatsApp
    if (whatsappToken && whatsappPhoneId && whatsappGroupId) {
      broadcastResults.whatsapp = await postToWhatsApp(whatsappToken, whatsappPhoneId, whatsappGroupId, text, imageUrl);
    }

    // Mark selected posts as shared in database if IDs are provided
    if (postIds && Array.isArray(postIds) && postIds.length > 0) {
      await prisma.blogPost.updateMany({
        where: {
          id: { in: postIds }
        },
        data: {
          socialShared: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      broadcastResults
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
