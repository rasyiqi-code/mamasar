import { Elysia } from 'elysia';
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  findOrCreateUserByGoogle,
  getUserFromSession,
} from '../../lib/db';
import { getEnv } from '../../lib/neon';
import { getNeonAuthBaseUrl, parseCookieString, resolveUser } from '../../lib/neon-auth';
import {
  checkRateLimit,
  createSessionCookieHeader,
  getClientIp,
  isHttpsRequest,
} from '../../lib/security';
import { jsonResponse, redirectResponse, strField, type ParsedBody } from '../context';

function appendCleanedSetCookies(
  headers: Headers,
  setCookies: string[],
  isHttps: boolean
): void {
  for (const sc of setCookies) {
    if (!isHttps) {
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
}

function getSetCookies(res: Response): string[] {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

export const authRoutes = new Elysia({ name: 'routes:auth', prefix: '/auth' })
  .get('/login', async ({ request }) => {
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200 });
    }

    const clientIp = getClientIp(request);
    const limit = checkRateLimit(`auth-oauth:ip:${clientIp}`, 20, 10 * 60 * 1000);
    if (!limit.allowed) {
      return redirectResponse('/dashboard?error=rate_limited');
    }

    const url = new URL(request.url);
    try {
      const baseUrl = getNeonAuthBaseUrl();
      if (!baseUrl) {
        return redirectResponse('/dashboard?error=neon_auth_unconfigured');
      }

      const origin = url.origin;
      const callbackURL = `${origin}/api/auth/callback/neon`;

      const neonRes = await fetch(`${baseUrl}/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          Cookie: request.headers.get('cookie') || '',
          'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
        },
        body: JSON.stringify({ provider: 'google', callbackURL }),
      });

      const data = await neonRes.json();
      if (neonRes.ok && data.url) {
        const headers = new Headers();
        appendCleanedSetCookies(headers, getSetCookies(neonRes), isHttpsRequest(request));
        return redirectResponse(data.url, 302, headers);
      }

      console.error('Neon Auth sign-in social failed:', neonRes.status, data);
      return redirectResponse('/dashboard?error=neon_auth_init_failed');
    } catch (err) {
      console.error('Neon Auth Login Exception:', err);
      return redirectResponse('/dashboard?error=neon_auth_error');
    }
  })
  .post('/email', async ({ request, body }) => {
    const data = body as ParsedBody;
    const action = strField(data, 'action') || 'signin';
    const normalizedEmail = strField(data, 'email').toLowerCase();
    const password = typeof data?.password === 'string' ? data.password : '';
    const name = strField(data, 'name');

    if (!normalizedEmail || !password) {
      return jsonResponse({ ok: false, error: 'Email dan password wajib diisi.' }, 400);
    }

    const clientIp = getClientIp(request);
    const ipLimit = checkRateLimit(`auth-email:ip:${clientIp}`, 15, 15 * 60 * 1000);
    const emailLimit = checkRateLimit(`auth-email:acct:${normalizedEmail}`, 6, 15 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return jsonResponse(
        {
          ok: false,
          error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${retryAfter} detik.`,
        },
        429,
        { 'Retry-After': String(retryAfter) }
      );
    }

    const baseUrl = getNeonAuthBaseUrl();
    if (!baseUrl) {
      return jsonResponse(
        { ok: false, error: 'Server autentikasi belum dikonfigurasi. Hubungi pengurus.' },
        503
      );
    }

    const origin = new URL(request.url).origin;
    const endpoint = action === 'signup' ? `${baseUrl}/sign-up/email` : `${baseUrl}/sign-in/email`;
    const payload: Record<string, string> = { email: normalizedEmail, password };
    if (action === 'signup') {
      payload.name = name || normalizedEmail.split('@')[0];
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        return jsonResponse(
          {
            ok: false,
            error:
              action === 'signup'
                ? 'Pendaftaran gagal. Pastikan format email benar, kata sandi minimal 8 karakter, dan email belum terdaftar.'
                : 'Email atau kata sandi tidak valid. Silakan periksa kembali.',
          },
          400
        );
      }

      const authUser = resData.user;
      const appUser = await findOrCreateUserByGoogle({
        googleId: `neon_${authUser.id}`,
        email: authUser.email,
        name: authUser.name || normalizedEmail.split('@')[0],
        avatarUrl: authUser.image || '',
      });

      const sessionId = await createSession(appUser.id);
      const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
      appendCleanedSetCookies(responseHeaders, getSetCookies(res), isHttpsRequest(request));
      responseHeaders.append('Set-Cookie', createSessionCookieHeader(sessionId, request));

      return new Response(
        JSON.stringify({ ok: true, user: appUser, redirect: '/dashboard' }),
        { status: 200, headers: responseHeaders }
      );
    } catch (err) {
      console.error('Neon Email Auth Exception:', err);
      return jsonResponse(
        {
          ok: false,
          error: 'Terjadi kendala pada server autentikasi Neon. Silakan coba sesaat lagi.',
        },
        500
      );
    }
  })
  .post('/logout', async ({ request }) => {
    const url = new URL(request.url);
    const cookieHeader = request.headers.get('cookie') || '';
    const parsedCookies = parseCookieString(cookieHeader);
    const sessionId = parsedCookies['mamasar_session'];

    if (sessionId) {
      try {
        const user = await getUserFromSession(sessionId);
        if (user) {
          await deleteUserSessions(user.id);
        } else {
          await deleteSession(sessionId);
        }
      } catch {
        // Non-blocking session cleanup
      }
    }

    const headers = new Headers();
    const isHttps = isHttpsRequest(request);

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
        appendCleanedSetCookies(headers, getSetCookies(upstreamRes), isHttps);
      }
    } catch {
      // Non-blocking upstream sign-out
    }

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

    for (const name of allCookieNames) {
      headers.append(
        'Set-Cookie',
        `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      );
      headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      );
      if (isHttps) {
        headers.append(
          'Set-Cookie',
          `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Partitioned`
        );
      }
    }

    headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');
    return redirectResponse('/dashboard?logged_out=1', 302, headers);
  })
  .get('/callback/google', async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error || !code) {
      return redirectResponse('/dashboard?error=auth_failed');
    }

    const clientId = getEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
    const redirectUri = getEnv('GOOGLE_REDIRECT_URI') || `${url.origin}/api/auth/callback/google`;

    if (!clientId || !clientSecret) {
      return redirectResponse('/dashboard?error=missing_credentials');
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Google token exchange error:', tokenData);
        return redirectResponse('/dashboard?error=token_exchange_failed');
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userInfo = await userInfoResponse.json();
      if (!userInfoResponse.ok || !userInfo.sub || !userInfo.email) {
        return redirectResponse('/dashboard?error=profile_fetch_failed');
      }

      const user = await findOrCreateUserByGoogle({
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        avatarUrl: userInfo.picture,
      });

      const sessionId = await createSession(user.id);
      const headers = new Headers();
      headers.append('Set-Cookie', createSessionCookieHeader(sessionId, request));
      return redirectResponse('/dashboard', 302, headers);
    } catch (err) {
      console.error('OAuth Callback Exception:', err);
      return redirectResponse('/dashboard?error=server_error');
    }
  })
  .get('/callback/neon', async ({ request }) => {
    try {
      const existingUser = await resolveUser(request);
      if (existingUser) {
        return redirectResponse('/dashboard');
      }
    } catch {
      // Continue with callback exchange
    }

    const url = new URL(request.url);
    const cookieHeader = request.headers.get('cookie') || '';
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Neon Auth callback error:', error);
      return redirectResponse(`/dashboard?error=${encodeURIComponent(error)}`);
    }

    const baseUrl = getNeonAuthBaseUrl();
    if (!baseUrl) {
      return redirectResponse('/dashboard?error=neon_auth_unconfigured');
    }

    try {
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

      const upstreamCookie = Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

      const upstreamRes = await fetch(`${baseUrl}/get-session${url.search}`, {
        method: 'GET',
        headers: {
          Cookie: upstreamCookie,
          Origin: url.origin,
          'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
          'x-neon-auth-middleware': 'true',
        },
      });

      const setCookies = getSetCookies(upstreamRes);
      if (!upstreamRes.ok) {
        console.error('Neon Auth upstream verification failed:', upstreamRes.status, await upstreamRes.text());
        return redirectResponse('/dashboard?error=neon_session_failed');
      }

      const data = await upstreamRes.json();
      if (!data || !data.user) {
        console.error('Neon Auth returned invalid user data:', data);
        return redirectResponse('/dashboard?error=invalid_user_data');
      }

      const appUser = await findOrCreateUserByGoogle({
        googleId: `neon_${data.user.id}`,
        email: data.user.email,
        name: data.user.name || data.user.email.split('@')[0],
        avatarUrl: data.user.image || '',
      });

      const sessionId = await createSession(appUser.id);
      const headers = new Headers();
      appendCleanedSetCookies(headers, setCookies, isHttpsRequest(request));
      headers.append('Set-Cookie', createSessionCookieHeader(sessionId, request));

      return redirectResponse('/dashboard', 302, headers);
    } catch (err) {
      console.error('Neon Auth Callback Exception:', err);
      return redirectResponse('/dashboard?error=neon_server_error');
    }
  });
