import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || '';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  return `${token}.${signature}`;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(csrfToken: string): boolean {
  if (!csrfToken) return false;
  const parts = csrfToken.split('.');
  if (parts.length !== 2) return false;
  const [token, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
