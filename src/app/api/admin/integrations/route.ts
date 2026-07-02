import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const autoBlogSettings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });

    let parsedAiKeys = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        parsedAiKeys = JSON.parse(siteSettings.aiApiKey);
      } else {
        // Migration from old string format
        parsedAiKeys = { openai: siteSettings?.aiApiKey || '' };
      }
    } catch (e) {}

    return NextResponse.json({
      aiKeys: parsedAiKeys,
      socialKeys: {
        twitter: autoBlogSettings?.twitter || '',
        instagramToken: autoBlogSettings?.instagramToken || '',
        instagramAccountId: autoBlogSettings?.instagramAccountId || '',
        whatsappToken: autoBlogSettings?.whatsappToken || '',
        whatsappPhoneId: autoBlogSettings?.whatsappPhoneId || '',
        whatsappGroupId: autoBlogSettings?.whatsappGroupId || '',
        telegramToken: autoBlogSettings?.telegramToken || '',
        telegramChatId: autoBlogSettings?.telegramChatId || '',
      },
      emailKeys: {
        smtpHost: autoBlogSettings?.smtpHost || '',
        smtpPort: autoBlogSettings?.smtpPort || 587,
        smtpUser: autoBlogSettings?.smtpUser || '',
        smtpPass: autoBlogSettings?.smtpPass || '',
        onesignalAppId: autoBlogSettings?.onesignalAppId || '',
        onesignalApiKey: autoBlogSettings?.onesignalApiKey || '',
      },
      imageSource: autoBlogSettings?.imageSource || 'unsplash'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { aiKeys, socialKeys, emailKeys, imageSource } = body;

    if (aiKeys) {
      await prisma.siteSettings.upsert({
        where: { id: 'default' },
        update: { aiApiKey: JSON.stringify(aiKeys) },
        create: { id: 'default', aiApiKey: JSON.stringify(aiKeys) }
      });
    }

    if (socialKeys || emailKeys || imageSource) {
      await prisma.autoBlogSettings.upsert({
        where: { id: 'default' },
        update: {
          ...socialKeys,
          ...emailKeys,
          ...(imageSource ? { imageSource } : {})
        },
        create: {
          id: 'default',
          ...socialKeys,
          ...emailKeys,
          ...(imageSource ? { imageSource } : {})
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update integrations' }, { status: 500 });
  }
}
