import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl, resolveUser } from '../../../../lib/neon-auth';
import { findOrCreateUserByGoogle, createSession } from '../../../../lib/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  // If the user already has an active session (e.g. refreshed or back-navigated callback), redirect to dashboard
  try {
    const existingUser = await resolveUser(request);
    if (existingUser) {
      return redirect('/dashboard');
    }
  } catch (_) {
    // Continue with callback exchange
  }

  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Neon Auth callback error:', error);
    return redirect(`/dashboard?error=${encodeURIComponent(error)}`);
  }

  const baseUrl = getNeonAuthBaseUrl();
  if (!baseUrl) {
    return redirect('/dashboard?error=neon_auth_unconfigured');
  }

  try {
    // Reconstruct upstream cookies: ensure all neon-auth cookies have __Secure-neon-auth equivalents
    const cookieMap = new Map<string, string>();
    if (cookieHeader) {
      cookieHeader.split(';').forEach((part) => {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          const name = part.slice(0, eqIdx).trim();
          const val = part.slice(eqIdx + 1).trim();
          if (name) cookieMap.set(name, val);
        }
      });
      for (const [name, val] of Array.from(cookieMap.entries())) {
        if (name.startsWith('neon-auth.') || name.startsWith('neon_auth.')) {
          const suffix = name.replace(/^neon[-_]auth\./, '');
          cookieMap.set(`__Secure-neon-auth.${suffix}`, val);
        }
      }
    }
    const upstreamCookie = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');

    // Forward the request to Neon Auth upstream to verify session challenge / verifier
    const upstreamUrl = `${baseUrl}/get-session${url.search}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Cookie: upstreamCookie,
        Origin: url.origin,
        'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
        'x-neon-auth-middleware': 'true',
      },
    });

    const setCookies = typeof upstreamRes.headers.getSetCookie === 'function'
      ? upstreamRes.headers.getSetCookie()
      : [upstreamRes.headers.get('set-cookie')].filter(Boolean) as string[];

    if (!upstreamRes.ok) {
      console.error('Neon Auth upstream verification failed:', upstreamRes.status, await upstreamRes.text());
      return redirect('/dashboard?error=neon_session_failed');
    }

    const data = await upstreamRes.json();
    if (!data || !data.user) {
      console.error('Neon Auth returned invalid user data:', data);
      return redirect('/dashboard?error=invalid_user_data');
    }

    // Sync user with local/Postgres database
    const appUser = await findOrCreateUserByGoogle({
      googleId: `neon_${data.user.id}`,
      email: data.user.email,
      name: data.user.name || data.user.email.split('@')[0],
      avatarUrl: data.user.image || '',
    });

    // Create session token
    const sessionId = await createSession(appUser.id);

    const headers = new Headers();
    // Forward Neon Auth set-cookie headers (cleaned for localhost if needed)
    for (const sc of setCookies) {
      if (url.protocol !== 'https:') {
        const cleaned = sc
          .replace(/__Secure-/g, '')
          .replace(/;\s*Secure/gi, '')
          .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
          .replace(/;\s*Partitioned/gi, '');
        headers.append('Set-Cookie', cleaned);
      } else {
        headers.append('Set-Cookie', sc);
      }
    }
    // Set mamasar_session cookie for local compatibility
    headers.append(
      'Set-Cookie',
      `mamasar_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );
    headers.set('Location', '/dashboard');

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    console.error('Neon Auth Callback Exception:', err);
    return redirect('/dashboard?error=neon_server_error');
  }
};
