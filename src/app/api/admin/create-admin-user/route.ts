import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const email = 'vsangwal54@gmail.com';
    const password = 'Vikas@0502@';
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'Admin',
        isVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        email,
        name: 'Vikas Sangwal',
        password: hashedPassword,
        role: 'Admin',
        isVerified: true,
        failedLoginAttempts: 0,
      }
    });

    return NextResponse.json({
      success: true,
      message: '✅ Admin User vsangwal54@gmail.com created/updated successfully with password Vikas@0502@',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
