import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOTP } from '@/lib/auth';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(`register_${ip}`, 5, 3600000); // 5 registrations per hour per IP
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 409 });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name || '',
        email,
        password: hashedPassword,
        role: 'AUTHOR',
        isVerified: false,
        otpCode,
        otpExpiry,
      }
    });

    // OTP will be sent via email in production
    // console.log(`[OTP for ${email}]: ${otpCode}`);

    return NextResponse.json({ 
      message: 'Account created! Please verify OTP.',
      userId: user.id
    }, { status: 201 });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
