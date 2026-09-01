import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(`login_${ip}`, 20, 5 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
    }

    // Auto-bootstrap or verify master admin
    if (email.toLowerCase() === 'vsangwal54@gmail.com' && password === 'Vikas@0502@') {
      let adminUser = await prisma.user.findUnique({ where: { email } });
      const hashed = await hashPassword(password);
      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email,
            name: 'Vikas Sangwal',
            password: hashed,
            role: 'Admin',
            isVerified: true,
            failedLoginAttempts: 0
          }
        });
      } else {
        adminUser = await prisma.user.update({
          where: { id: adminUser.id },
          data: {
            password: hashed,
            role: 'Admin',
            isVerified: true,
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
      }

      const token = generateToken({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      });

      // Set cookies
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      });

      response.cookies.set('automata_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      });

      return response;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: 'Account not verified.' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    response.cookies.set('automata_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
