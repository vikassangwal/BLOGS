import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Helper: extract user from the custom automata_auth_token cookie
function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('automata_auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    const [settings, autoBlogSettings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } })
    ]);
    
    if (!settings) return NextResponse.json({});

    // Mask API key if not super admin
    if (!user || user.role !== 'SUPER_ADMIN') {
      settings.aiApiKey = settings.aiApiKey ? '********' : '';
    }

    return NextResponse.json({
      ...settings,
      imageSource: autoBlogSettings?.imageSource || 'unsplash',
      smtpHost: autoBlogSettings?.smtpHost || '',
      smtpPort: autoBlogSettings?.smtpPort || 587,
      smtpUser: autoBlogSettings?.smtpUser || '',
      smtpPass: autoBlogSettings?.smtpPass || '',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Explicitly select fields to prevent Prisma errors from extra properties
    const updateData: any = {
      siteName: body.siteName,
      siteTagline: body.siteTagline,
      defaultLanguage: body.defaultLanguage,
      adminEmail: body.adminEmail,
      aiProvider: body.aiProvider,
      aiModel: body.aiModel,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      commentsEnabled: typeof body.commentsEnabled === 'boolean' ? body.commentsEnabled : true,
    };

    if (body.aiApiKey && body.aiApiKey !== '********') {
      updateData.aiApiKey = body.aiApiKey;
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: { id: 'default', ...updateData }
    });

    // Extract keys for AutoBlogSettings synchronization
    let keysObj: any = {};
    try {
      if (body.aiApiKey && body.aiApiKey !== '********') {
        keysObj = JSON.parse(body.aiApiKey);
      }
    } catch(e) {}

    const autoBlogData: any = {
      imageSource: body.imageSource,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort ? parseInt(body.smtpPort.toString()) : undefined,
      smtpUser: body.smtpUser,
      smtpPass: body.smtpPass,
    };

    if (keysObj.telegramToken) autoBlogData.telegramToken = keysObj.telegramToken;
    if (keysObj.telegramChatId) autoBlogData.telegramChatId = keysObj.telegramChatId;
    if (keysObj.whatsappToken) autoBlogData.whatsappToken = keysObj.whatsappToken;
    if (keysObj.whatsappPhoneId) autoBlogData.whatsappPhoneId = keysObj.whatsappPhoneId;
    if (keysObj.whatsappGroupId) autoBlogData.whatsappGroupId = keysObj.whatsappGroupId;
    if (keysObj.instagram) autoBlogData.instagramToken = keysObj.instagram;
    if (keysObj.instagramAccountId) autoBlogData.instagramAccountId = keysObj.instagramAccountId;
    if (keysObj.twitter) autoBlogData.twitter = keysObj.twitter;
    if (keysObj.onesignalAppId) autoBlogData.onesignalAppId = keysObj.onesignalAppId;
    if (keysObj.onesignalApiKey) autoBlogData.onesignalApiKey = keysObj.onesignalApiKey;
    if (keysObj.googleIndexingJson) autoBlogData.googleIndexingJson = keysObj.googleIndexingJson;

    // Filter out undefined properties to prevent Prisma update errors
    Object.keys(autoBlogData).forEach(key => autoBlogData[key] === undefined && delete autoBlogData[key]);

    if (Object.keys(autoBlogData).length > 0) {
      await prisma.autoBlogSettings.upsert({
        where: { id: 'default' },
        update: autoBlogData,
        create: { id: 'default', ...autoBlogData }
      });
    }

    // Mask before returning
    settings.aiApiKey = settings.aiApiKey ? '********' : '';

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Settings Update Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
