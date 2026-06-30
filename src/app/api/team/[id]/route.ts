import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const member = await prisma.teamMember.findUnique({
      where: { id: params.id }
    });
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const body = await request.json();
    const { name, role, bio, fullDetails, imageUrl, socialLinks, isActive } = body;

    const member = await prisma.teamMember.update({
      where: { id: params.id },
      data: { name, role, bio, fullDetails, imageUrl, socialLinks, isActive }
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    await prisma.teamMember.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
