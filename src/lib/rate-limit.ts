// Basic in-memory rate limiter for serverless (resets on cold start)
// TODO: For high-traffic production on Vercel, replace this Map with @upstash/redis
// Example: const redis = Redis.fromEnv(); await redis.incr(ip);
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();

export function checkRateLimit(ip: string, limit: number = 10, windowMs: number = 60000): { success: boolean, remaining: number } {
  const now = Date.now();
  const record = rateLimitCache.get(ip);

  // Clean up old entries occasionally (10% chance)
  if (Math.random() < 0.1) {
    for (const [key, val] of rateLimitCache.entries()) {
      if (val.resetTime < now) {
        rateLimitCache.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}

export function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
}
