import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    const message = update?.message;
    const text = message?.text || '';
    const chatId = message?.chat?.id;

    if (!text || !chatId) {
      return NextResponse.json({ ok: true });
    }

    // Check if message contains a URL
    const urlMatch = text.match(/https?:\/\/[^\s]+/);

    if (urlMatch) {
      const targetUrl = urlMatch[0];
      
      // Call internal url-to-blog API
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://knowora.in';
      const res = await fetch(`${baseUrl}/api/admin/url-to-blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, preferredProvider: 'gemini' })
      });

      const data = await res.json();
      console.log('Telegram publish response:', data);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: true, error: e.message });
  }
}
