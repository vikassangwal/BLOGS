import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Allow the login page
    if (pathname === '/admin/login') {
      return response;
    }

    const token = request.cookies.get('automata_auth_token')?.value;

    if (!token || !JWT_SECRET) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jose.jwtVerify(token, secret);
      return response;
    } catch {
      // Token invalid or expired
      const redirectResponse = NextResponse.redirect(new URL('/admin/login', request.url));
      redirectResponse.cookies.delete('automata_auth_token');
      return redirectResponse;
    }
  }

  // Rate limiting header for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', '100');
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
