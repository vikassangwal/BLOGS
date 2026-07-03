import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const [keywords, total] = await Promise.all([
      prisma.autoBlogKeyword.findMany({
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.autoBlogKeyword.count(),
    ]);

    return NextResponse.json({ keywords, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { keywords, niche, priority = 0 } = body;

    if (!keywords) {
      return NextResponse.json({ error: 'Keywords required' }, { status: 400 });
    }

    let keywordList: string[] = [];
    if (typeof keywords === 'string') {
      keywordList = keywords.split('\n').map(k => k.trim()).filter(k => k);
    } else if (Array.isArray(keywords)) {
      keywordList = keywords;
    }

    let addedCount = 0;
    for (const kw of keywordList) {
      // Check if exists
      const exists = await prisma.autoBlogKeyword.findFirst({ where: { keyword: kw } });
      if (!exists) {
        await prisma.autoBlogKeyword.create({
          data: { keyword: kw, niche, priority: parseInt(priority.toString()) }
        });
        addedCount++;
      }
    }

    return NextResponse.json({ success: true, added: addedCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add keywords' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.autoBlogKeyword.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 });
  }
}
