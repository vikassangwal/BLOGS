import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const page = await prisma.staticPage.findUnique({
      where: { slug: params.slug }
    });
    
    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, page });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch page' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { title, slug, content, isActive } = await req.json();

    const updatedPage = await prisma.staticPage.update({
      where: { slug: params.slug },
      data: {
        title,
        slug, // Update slug if provided, though risky if links depend on it
        content,
        isActive
      }
    });

    return NextResponse.json({ success: true, page: updatedPage });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    await prisma.staticPage.delete({
      where: { slug: params.slug }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete page' }, { status: 500 });
  }
}
