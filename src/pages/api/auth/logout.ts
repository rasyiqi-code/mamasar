import type { APIRoute } from 'astro';
import { deleteSession, deleteUserSessions, getUserFromSession } from '../../../lib/db';
import { getNeonAuthBaseUrl, parseCookieString } from '../../../lib/neon-auth';

export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';
  const parsedCookies = parseCookieString(cookieHeader);
  const sessionId = parsedCookies['mamasar_session'];

  // Delete local session(s) in PostgreSQL
  if (sessionId) {
    try {
      const user = await getUserFromSession(sessionId);
      if (user) {
        await deleteUserSessions(user.id);
      } else {
        await deleteSession(sessionId);
      }
    } catch (_) {}
  }

  const headers = new Headers();

  // Attempt to notify Neon Auth upstream to revoke session
  try {
    const baseUrl = getNeonAuthBaseUrl();
    if (baseUrl) {
      const upstreamRes = await fetch(`${baseUrl}/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          Origin: url.origin,
          'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
        },
        body: JSON.stringify({}),
      });

      const setCookies = typeof upstreamRes.headers.getSetCookie === 'function'
        ? upstreamRes.headers.getSetCookie()
        : [upstreamRes.headers.get('set-cookie')].filter(Boolean) as string[];

      for (const sc of setCookies) {
        if (url.protocol !== 'https:') {
          const cleaned = sc.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
          headers.append('Set-Cookie', cleaned);
        } else {
          headers.append('Set-Cookie', sc);
        }
      }
    }
  } catch (e) {
    // Non-blocking
  }

  // Clear all cookies found in request + all known auth cookie names
  const allCookieNames = new Set([
    ...Object.keys(parsedCookies),
    'mamasar_session',
    'neon-auth.session_token',
    '__Secure-neon-auth.session_token',
    'neon-auth.session_data',
    '__Secure-neon-auth.session_data',
    'neon-auth.session_challenge',
    '__Secure-neon-auth.session_challenge',
    'neon-auth.session_challange',
    '__Secure-neon-auth.session_challange',
    'neon-auth.dont_remember',
    '__Secure-neon-auth.dont_remember',
    'neon-auth.state',
    '__Secure-neon-auth.state',
    'neon-auth.aid',
    '__Secure-neon-auth.aid',
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    'better-auth.session_data',
    '__Secure-better-auth.session_data',
    'better-auth.state',
    '__Secure-better-auth.state',
  ]);

  const isHttps = url.protocol === 'https:';

  for (const name of allCookieNames) {
    // 1. Plain HTTP version (works reliably on localhost HTTP and across all browsers)
    headers.append(
      'Set-Cookie',
      `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );

    // 2. HTTPS Partitioned version (for production HTTPS)
    if (isHttps) {
      headers.append(
        'Set-Cookie',
        `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Partitioned`
      );
    }
  }

  headers.set('Location', '/dashboard?logged_out=1');

  return new Response(null, {
    status: 302,
    headers,
  });
};
