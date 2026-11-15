import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl } from '../../../lib/neon-auth';
import { findOrCreateUserByGoogle, createSession } from '../../../lib/db';
import { checkRateLimit, createSessionCookieHeader, getClientIp, isHttpsRequest } from '../../../lib/security';

export const POST: APIRoute = async ({ request }) => {
  let body: any = {};

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else if (contentType.includes('form')) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  const { action = 'signin', email, password, name } = body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password) {
    return new Response(JSON.stringify({ ok: false, error: 'Email dan password wajib diisi.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientIp = getClientIp(request);
  const ipLimit = checkRateLimit(`auth-email:ip:${clientIp}`, 15, 15 * 60 * 1000);
  const emailLimit = checkRateLimit(`auth-email:acct:${normalizedEmail}`, 6, 15 * 60 * 1000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${retryAfter} detik.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  const baseUrl = getNeonAuthBaseUrl();
  if (!baseUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'Server autentikasi belum dikonfigurasi. Hubungi pengurus.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const origin = new URL(request.url).origin;
  const endpoint = action === 'signup' ? `${baseUrl}/sign-up/email` : `${baseUrl}/sign-in/email`;

  const payload: any = { email: normalizedEmail, password };
  if (action === 'signup') {
    payload.name = (typeof name === 'string' && name.trim()) || normalizedEmail.split('@')[0];
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

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            action === 'signup'
              ? 'Pendaftaran gagal. Pastikan format email benar, kata sandi minimal 8 karakter, dan email belum terdaftar.'
              : 'Email atau kata sandi tidak valid. Silakan periksa kembali.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const setCookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean) as string[];

    const user = data.user;
    const appUser = await findOrCreateUserByGoogle({
      googleId: `neon_${user.id}`,
      email: user.email,
      name: user.name || normalizedEmail.split('@')[0],
      avatarUrl: user.image || '',
    });

    const sessionId = await createSession(appUser.id);
    const https = isHttpsRequest(request);

    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
    });

    for (const sc of setCookies) {
      if (!https) {
        const cleaned = sc
          .replace(/__Secure-/g, '')
          .replace(/;\s*Secure/gi, '')
          .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
          .replace(/;\s*Partitioned/gi, '');
        responseHeaders.append('Set-Cookie', cleaned);
      } else {
        responseHeaders.append('Set-Cookie', sc);
      }
    }
    responseHeaders.append('Set-Cookie', createSessionCookieHeader(sessionId, request));

    return new Response(
      JSON.stringify({
        ok: true,
        user: appUser,
        redirect: '/dashboard',
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (err: any) {
    console.error('Neon Email Auth Exception:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Terjadi kendala pada server autentikasi Neon. Silakan coba sesaat lagi.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
