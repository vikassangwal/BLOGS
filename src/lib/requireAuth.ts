import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export type AuthUser = { userId: string; email: string; role: string };

/**
 * Extract and verify the logged-in user from the automata_auth_token cookie.
 * Returns null if there is no valid token.
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = request.cookies.get('automata_auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Guard for admin-only routes.
 * Usage:
 *   const auth = requireAdmin(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is a verified admin AuthUser from here on
 */
export function requireAdmin(
  request: NextRequest,
  allowedRoles: string[] = ADMIN_ROLES
): AuthUser | NextResponse {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return user;
}

/** Guard for super-admin-only routes (e.g. managing other users). */
export function requireSuperAdmin(request: NextRequest): AuthUser | NextResponse {
  return requireAdmin(request, ['SUPER_ADMIN']);
}
