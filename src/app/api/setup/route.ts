import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const existing = await prisma.user.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists' });
    }

    const hashedPassword = await hashPassword('Vikas@0502');
    const user = await prisma.user.create({
      data: {
        name: 'Vikas Sangwal',
        email: 'vsangwal54@gmail.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isVerified: true
      }
    });

    return NextResponse.json({ 
      message: 'Admin account created successfully!',
      credentials: {
        email: 'vsangwal54@gmail.com',
        password: 'Vikas@0502'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
