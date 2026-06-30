import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) return NextResponse.json({});

    // Mask API key if not super admin
    if (!user || (user as any).role !== 'SUPER_ADMIN') {
      settings.aiApiKey = settings.aiApiKey ? '********' : '';
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Explicitly select fields to prevent Prisma errors from extra properties
    const updateData: any = {
      siteName: body.siteName,
      siteTagline: body.siteTagline,
      adminEmail: body.adminEmail,
      aiProvider: body.aiProvider,
      aiModel: body.aiModel,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
    };

    if (body.aiApiKey && body.aiApiKey !== '********') {
      updateData.aiApiKey = body.aiApiKey;
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: { id: 'default', ...updateData }
    });

    // Mask before returning
    settings.aiApiKey = settings.aiApiKey ? '********' : '';

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Settings Update Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
