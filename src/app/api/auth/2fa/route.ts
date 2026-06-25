import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateTOTPSecret, verifyTOTP, getTOTPUri, generateRecoveryCodes } from '@/lib/totp';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, code } = body;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Action: SETUP
    if (action === 'setup') {
      const secret = generateTOTPSecret();
      
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false } // Save secret but don't enable yet
      });

      const uri = getTOTPUri(secret, dbUser.email, 'AntiGravity');
      return NextResponse.json({ secret, uri });
    }

    // Action: VERIFY
    if (action === 'verify') {
      if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });
      if (!dbUser.twoFactorSecret) return NextResponse.json({ error: '2FA not setup' }, { status: 400 });

      const isValid = verifyTOTP(dbUser.twoFactorSecret, code);
      if (!isValid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

      const recoveryCodes = generateRecoveryCodes(8);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          twoFactorEnabled: true,
          recoveryCodes: JSON.stringify(recoveryCodes)
        }
      });

      return NextResponse.json({ success: true, recoveryCodes });
    }

    // Action: DISABLE
    if (action === 'disable') {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCodes: null
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('2FA error:', error);
    return NextResponse.json({ error: '2FA operation failed' }, { status: 500 });
  }
}
