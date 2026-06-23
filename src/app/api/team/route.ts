import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
    const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, role, bio, fullDetails, imageUrl, socialLinks, isActive } = body;

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const member = await prisma.teamMember.create({
      data: {
        name,
        role,
        bio: bio || '',
        fullDetails: fullDetails || '',
        imageUrl,
        socialLinks,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}
