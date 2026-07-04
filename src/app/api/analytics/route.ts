import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { path, postId } = await request.json();

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Google Analytics handles the tracking now.
    // We simply return success so the client doesn't throw errors.
    return NextResponse.json({ success: true, method: 'google_analytics' });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
