import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      const newSettings = await prisma.autoBlogSettings.create({
        data: { id: 'default' }
      });
      return NextResponse.json(newSettings);
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { isActive, frequency, maxPostsPerRun, maxPostsPerDay, imageSource, autoPublish, embedYoutube } = body;

    const updated = await prisma.autoBlogSettings.upsert({
      where: { id: 'default' },
      update: {
        isActive: isActive !== undefined ? isActive : undefined,
        frequency,
        maxPostsPerRun: maxPostsPerRun ? parseInt(maxPostsPerRun.toString()) : undefined,
        maxPostsPerDay: maxPostsPerDay ? parseInt(maxPostsPerDay.toString()) : undefined,
        imageSource,
        autoPublish: autoPublish !== undefined ? autoPublish : undefined,
        embedYoutube: embedYoutube !== undefined ? embedYoutube : undefined,
      },
      create: {
        id: 'default',
        isActive: !!isActive,
        frequency: frequency || 'daily',
        maxPostsPerRun: maxPostsPerRun ? parseInt(maxPostsPerRun.toString()) : 1,
        maxPostsPerDay: maxPostsPerDay ? parseInt(maxPostsPerDay.toString()) : 5,
        imageSource: imageSource || 'unsplash',
        autoPublish: autoPublish !== undefined ? autoPublish : true,
        embedYoutube: embedYoutube !== undefined ? embedYoutube : true,
      }
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
