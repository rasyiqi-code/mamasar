import { findOrCreateUserByGoogle, createSession, getUserFromSession, getUMKMByUserId } from './db';
import type { User, UMKM } from './types';

export function getNeonAuthBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEON_AUTH_BASE_URL) {
    return process.env.NEON_AUTH_BASE_URL;
  }
  return 'https://ep-patient-water-a1v24o66.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth';
}

/**
 * Parses cookies from cookie header
 */
export function parseCookieString(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((part) => {
    const [key, ...val] = part.trim().split('=');
    if (key) {
      cookies[key.trim()] = decodeURIComponent(val.join('='));
    }
  });

  return cookies;
}

/**
 * Validates session against Neon Auth and syncs with local/Postgres user table.
 */
export async function getNeonAuthUser(cookieHeader: string | null): Promise<{
  user: User;
  neonSession: any;
  sessionId: string;
} | null> {
  if (!cookieHeader) return null;

  const cookies = parseCookieString(cookieHeader);
  const neonToken =
    cookies['__Secure-neon-auth.session_token'] ||
    cookies['neon_auth.session_token'] ||
    cookies['better-auth.session_token'];

  if (!neonToken) return null;

  const baseUrl = getNeonAuthBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/get-session`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Origin: 'https://mamasar.vercel.app',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.user || !data.session) return null;

    // Sync Neon Auth user into our app users table
    const appUser = findOrCreateUserByGoogle({
      googleId: `neon_${data.user.id}`,
      email: data.user.email,
      name: data.user.name || data.user.email.split('@')[0],
      avatarUrl: data.user.image || '',
    });

    // Ensure session is mapped
    const sessionId = createSession(appUser.id);

    return {
      user: appUser,
      neonSession: data.session,
      sessionId,
    };
  } catch (err) {
    console.error('Error verifying Neon Auth session:', err);
    return null;
  }
}

/**
 * Universal resolver to get the active user and their UMKM store
 * Checks both local `mamasar_session` and Neon Auth session cookies.
 */
export async function resolveUser(
  requestOrCookies: Request | { headers: Headers } | string | null
): Promise<(User & { umkm?: UMKM & { zone_name: string; zone_slug: string } }) | null> {
  let cookieHeader = '';

  if (typeof requestOrCookies === 'string') {
    cookieHeader = requestOrCookies;
  } else if (requestOrCookies && 'headers' in requestOrCookies) {
    cookieHeader = requestOrCookies.headers.get('cookie') || '';
  }

  // 1. Try local mamasar_session cookie first (fast-path)
  const cookies = parseCookieString(cookieHeader);
  const mamasarSessionId = cookies['mamasar_session'];

  if (mamasarSessionId) {
    const user = getUserFromSession(mamasarSessionId);
    if (user) return user;
  }

  // 2. Try Neon Auth session token
  const neonResult = await getNeonAuthUser(cookieHeader);
  if (neonResult) {
    const store = getUMKMByUserId(neonResult.user.id);
    return {
      ...neonResult.user,
      umkm: store || undefined,
    };
  }

  return null;
}
