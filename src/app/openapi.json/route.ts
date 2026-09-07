import { NextResponse } from 'next/server';
import openApiDoc from '@/../public/openapi.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(openApiDoc, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
