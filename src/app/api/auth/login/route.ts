import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, getIP } from '@/lib/rate-limit';
import * as jose from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return new TextEncoder().encode(secret);
}

export async function POST(request: Request) {
  try {
    // Throttle login attempts per IP (10 attempts / 5 minutes).
    const ip = getIP(request);
    const rl = checkRateLimit(`login_${ip}`, 10, 5 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Simulate delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check brute-force lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({ error: `Account locked. Try again in ${minutesLeft} minutes.` }, { status: 403 });
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: 'Account not verified.' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      let updateData: any = { failedLoginAttempts: attempts };
      
      // Lock account after 5 failed attempts for 15 minutes
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60000);
      }
      
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Generate short-lived temporary token for 2FA verification step
      const secret = getJwtSecret();
      const tempToken = await new jose.SignJWT({ userId: user.id, email: user.email, temp: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('5m')
        .sign(secret);
        
      return NextResponse.json({ 
        requires2FA: true, 
        tempToken,
        message: '2FA required'
      });
    }

    // No 2FA, generate standard JWT
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ 
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
    
    response.cookies.set('automata_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
