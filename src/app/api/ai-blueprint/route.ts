import { NextResponse } from 'next/server';
import masterConfig from '@/lib/master-sources-config.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(masterConfig, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
      'Content-Type': 'application/json'
    }
  });
}

