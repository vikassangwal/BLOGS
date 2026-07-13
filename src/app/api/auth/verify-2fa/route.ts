import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { verifyTOTP } from '@/lib/totp';
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
    const body = await request.json();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 });
    }

    // Verify temp token
    let payload;
    try {
      const secret = getJwtSecret();
      const { payload: decoded } = await jose.jwtVerify(tempToken, secret);
      payload = decoded as { userId: string; email: string; temp: boolean };
      if (!payload.temp) throw new Error('Invalid token type');
    } catch {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Invalid user or 2FA setup' }, { status: 400 });
    }

    // Check code
    let isValid = false;
    let isRecoveryCode = false;

    if (code.length === 6) {
      // Standard TOTP
      isValid = verifyTOTP(user.twoFactorSecret, code);
    } else if (code.length === 9 && user.recoveryCodes) {
      // Recovery code (XXXX-XXXX format)
      let codes: string[] = [];
      try {
        codes = JSON.parse(user.recoveryCodes);
      } catch {}
      
      const codeIndex = codes.indexOf(code);
      if (codeIndex !== -1) {
        isValid = true;
        isRecoveryCode = true;
        // Remove used recovery code
        codes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { recoveryCodes: JSON.stringify(codes) }
        });
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    // Generate full JWT
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ 
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      usedRecoveryCode: isRecoveryCode
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
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
