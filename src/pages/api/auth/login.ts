import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl } from '../../../lib/neon-auth';

export const GET: APIRoute = async ({ request, redirect }) => {
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200 });
  }

  const url = new URL(request.url);

  // Neon Auth Google Social Login Flow
  try {
    const baseUrl = getNeonAuthBaseUrl();
    if (!baseUrl) {
      return redirect('/dashboard?error=neon_auth_unconfigured');
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
      body: JSON.stringify({
        provider: 'google',
        callbackURL,
      }),
    });

    const data = await neonRes.json();

    if (neonRes.ok && data.url) {
      const headers = new Headers();
      const setCookies = typeof neonRes.headers.getSetCookie === 'function'
        ? neonRes.headers.getSetCookie()
        : [neonRes.headers.get('set-cookie')].filter(Boolean) as string[];

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

      headers.set('Location', data.url);
      return new Response(null, {
        status: 302,
        headers,
      });
    }

    console.error('Neon Auth sign-in social failed:', neonRes.status, data);
    return redirect('/dashboard?error=neon_auth_init_failed');
  } catch (err: any) {
    console.error('Neon Auth Login Exception:', err);
    return redirect('/dashboard?error=neon_auth_error');
  }
};
