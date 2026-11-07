import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl } from '../../../lib/neon-auth';
import { findOrCreateUserByGoogle, createSession } from '../../../lib/db';

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

  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, error: 'Email dan password wajib diisi.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = getNeonAuthBaseUrl();
  const origin = new URL(request.url).origin;
  const endpoint = action === 'signup' ? `${baseUrl}/sign-up/email` : `${baseUrl}/sign-in/email`;

  const payload: any = { email, password };
  if (action === 'signup') {
    payload.name = name || email.split('@')[0];
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
          error: data.message || 'Autentikasi Neon Auth gagal. Silakan periksa kembali email dan kata sandi Anda.',
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
    const appUser = findOrCreateUserByGoogle({
      googleId: `neon_${user.id}`,
      email: user.email,
      name: user.name || email.split('@')[0],
      avatarUrl: user.image || '',
    });

    const sessionId = createSession(appUser.id);

    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
    });

    for (const sc of setCookies) {
      responseHeaders.append('Set-Cookie', sc);
    }
    responseHeaders.append(
      'Set-Cookie',
      `mamasar_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );

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
