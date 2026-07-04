import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pages = await prisma.staticPage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, pages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, slug, content, isActive } = await req.json();
    
    if (!title || !slug) {
      return NextResponse.json({ success: false, error: 'Title and slug are required' }, { status: 400 });
    }

    const newPage = await prisma.staticPage.create({
      data: {
        title,
        slug,
        content: content || '',
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ success: true, page: newPage });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Slug must be unique' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create page' }, { status: 500 });
  }
}
