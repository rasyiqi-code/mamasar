import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/db';
import { getNeonAuthBaseUrl } from '../../../lib/neon-auth';

export const ALL: APIRoute = async ({ request, redirect }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionId = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('mamasar_session='))
    ?.split('=')[1];

  if (sessionId) {
    deleteSession(sessionId);
  }

  // Attempt to notify Neon Auth upstream to revoke session
  try {
    const baseUrl = getNeonAuthBaseUrl();
    await fetch(`${baseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        Origin: new URL(request.url).origin,
      },
    });
  } catch (e) {
    // Non-blocking
  }

  const headers = new Headers();
  headers.append('Set-Cookie', 'mamasar_session=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  headers.append('Set-Cookie', '__Secure-neon-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  headers.append('Set-Cookie', '__Secure-neon-auth.session_data=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  headers.append('Set-Cookie', '__Secure-neon-auth.session_challenge=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  headers.set('Location', '/');

  return new Response(null, {
    status: 302,
    headers,
  });
};
