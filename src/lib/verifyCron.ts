import { NextResponse } from 'next/server';

/**
 * Verifies that an incoming request is an authorized cron/internal call.
 *
 * Accepts the secret via any of:
 *   - Authorization: Bearer <CRON_SECRET>
 *   - x-cron-secret: <CRON_SECRET>
 *   - ?secret=<CRON_SECRET> query param
 *
 * SECURITY: If CRON_SECRET is not configured on the server, ALL calls are
 * rejected. There is no hardcoded fallback secret.
 *
 * Returns null when the request is authorized, or a 401/500 NextResponse
 * that the caller should return immediately.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    // Fail closed: without a configured secret we cannot authorize anyone.
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET is not set' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-cron-secret');
  let querySecret: string | null = null;
  try {
    querySecret = new URL(request.url).searchParams.get('secret');
  } catch {
    querySecret = null;
  }

  const authorized =
    authHeader === `Bearer ${expectedSecret}` ||
    headerSecret === expectedSecret ||
    querySecret === expectedSecret;

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
