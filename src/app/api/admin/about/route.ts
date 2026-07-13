import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    let setting = await prisma.aboutSetting.findUnique({
      where: { id: 'default' }
    });

    if (!setting) {
      setting = await prisma.aboutSetting.create({
        data: {
          id: 'default',
          heading: 'About Our Blog',
          content: 'At Our Blog, our mission is to empower readers with high-quality, expertly curated content across Technology, Education & Career, and Finance & Earning. We believe that knowledge should be accessible, accurate, and actionable. Our platform leverages advanced AI combined with human expertise to bring you the most reliable insights.',
          mission: "We adhere strictly to Google's E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness) guidelines. Our content is generated and reviewed by industry professionals to ensure that the information you receive is not only engaging but also factually correct and trustworthy.",
        }
      });
    }
    
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch about settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    
    const setting = await prisma.aboutSetting.upsert({
      where: { id: 'default' },
      update: {
        heading: body.heading,
        content: body.content,
        mission: body.mission,
        imageUrl: body.imageUrl,
      },
      create: {
        id: 'default',
        heading: body.heading || 'About Our Blog',
        content: body.content || '',
        mission: body.mission || '',
        imageUrl: body.imageUrl,
      }
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update about settings' }, { status: 500 });
  }
}
