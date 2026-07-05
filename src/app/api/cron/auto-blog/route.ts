import { NextRequest } from 'next/server';
import { POST } from '../../auto-blog/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s limit for Hobby

export async function GET(request: NextRequest) {
  // Pass the GET request to the main POST logic
  return POST(request);
}
