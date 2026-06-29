import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // A very lightweight query just to wake up the database and keep the connection alive
    const count = await prisma.siteSettings.count();
    return NextResponse.json({ status: 'awake', count, time: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
