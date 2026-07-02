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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { post: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// Simple in-memory rate limiting map for basic DDoS/Spam protection
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour window
    return false;
  }
  if (now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  if (record.count >= 5) {
    return true; // Limit exceeded (Max 5 leads per IP per hour)
  }
  record.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    if (ip !== 'unknown' && isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { name, email, phone, source, postId } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name: name || 'Anonymous',
        email,
        phone,
        source: source || 'unknown',
        postId: postId || null
      }
    });

    // Send Welcome Email via Resend if configured
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      if (settings?.aiApiKey?.startsWith('{')) {
        const parsedKeys = JSON.parse(settings.aiApiKey);
        if (parsedKeys.resend) {
          const { Resend } = require('resend');
          const resend = new Resend(parsedKeys.resend);
          
          await resend.emails.send({
            from: 'Welcome <onboarding@resend.dev>', // Resend testing domain
            to: email,
            subject: `Welcome to ${settings.siteName || 'Our Blog'}!`,
            html: `<p>Hi ${name || 'there'},</p>
                   <p>Thank you for subscribing to our updates!</p>
                   <p>Stay tuned for more amazing content.</p>
                   <br/>
                   <p>Best,<br/>The Team</p>`
          });
        }
      }
    } catch(e) {
      console.error('Failed to send welcome email:', e);
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}
