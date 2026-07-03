import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(`verify_${ip}`, 10, 300000); // 10 attempts per 5 minutes per IP
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { userId, otpCode } = body;

    if (!userId || !otpCode) {
      return NextResponse.json({ error: 'User ID and OTP are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: 'Already verified' });
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

    if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) {
      return NextResponse.json({ error: 'OTP has expired. Please register again.' }, { status: 400 });
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otpCode: null, otpExpiry: null }
    });

    return NextResponse.json({ message: 'Account verified successfully! You can now login.' });

  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
