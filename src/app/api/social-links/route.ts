import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const links = await prisma.socialLink.findMany({ orderBy: { displayOrder: 'asc' } });
    return NextResponse.json(links);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch social links' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const link = await prisma.socialLink.create({
      data: {
        platform: data.platform,
        label: data.label,
        url: data.url,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
      }
    });
    return NextResponse.json(link);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    const link = await prisma.socialLink.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(link);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update social link' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await prisma.socialLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
  }
}
