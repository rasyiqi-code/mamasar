import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

function isPrivateIpv4(addr: string): boolean {
  const parts = addr.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (AWS metadata & CGN)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

function isPrivateIpv6(addr: string): boolean {
  const low = addr.toLowerCase();
  if (low === '::1' || low === '::') return true; // loopback / unspecified
  if (low.startsWith('fc') || low.startsWith('fd')) return true; // fc00::/7 unique-local
  if (low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // fe80::/10 link-local
  if (low.startsWith('::ffff:') && isPrivateIpv4(low.slice(7))) return true; // IPv4-mapped
  return false;
}

function isReservedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === 'localhost.localdomain' || h === '0.0.0.0') return true;
  return h.endsWith('.localhost') || h.endsWith('.local');
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 hari

/**
 * Safely serialize JSON for inline <script type="application/ld+json"> or <script type="application/json">
 * by escaping HTML-significant characters and JS line terminators so user-controlled strings
 * cannot break out of the script element (XSS).
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Standardized API error response: logs internal details server-side and never leaks
 * database driver/stack internals to clients.
 */
export function jsonError(
  status: number,
  publicMessage: string,
  internalError?: unknown,
  extraHeaders?: Record<string, string>
): Response {
  if (internalError !== undefined) {
    console.error(`[API ${status}] ${publicMessage}:`, internalError);
  }
  return new Response(
    JSON.stringify({
      success: false,
      message: publicMessage,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
    }
  );
}

export function isHttpsRequest(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (proto) return proto === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function createSessionCookieHeader(sessionId: string, request: Request): string {
  const secureFlag = isHttpsRequest(request) ? '; Secure' : '';
  return `mamasar_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureFlag}`;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  if (rateBuckets.size > 2000) {
    for (const [k, b] of rateBuckets.entries()) {
      if (b.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, limit - 1) };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - existing.count),
  };
}

export function isSafeMediaUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/uploads/') && !url.includes('..')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function isSafeOutboundUrl(urlString: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;

  const hostname = url.hostname;
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return !isPrivateIpv4(hostname) && hostname !== '0.0.0.0';
  if (ipVersion === 6) return !isPrivateIpv6(hostname);

  if (isReservedHostname(hostname)) return false;

  try {
    const { address } = await lookup(hostname, { family: 0, verbatim: true });
    const version = isIP(address);
    if (version === 4) return !isPrivateIpv4(address);
    if (version === 6) return !isPrivateIpv6(address);
    return false;
  } catch {
    return false;
  }
}
