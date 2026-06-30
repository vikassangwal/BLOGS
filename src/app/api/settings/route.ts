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

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) return NextResponse.json({});

    // Mask API key if not super admin
    if (!user || user.role !== 'SUPER_ADMIN') {
      settings.aiApiKey = settings.aiApiKey ? '********' : '';
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
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
