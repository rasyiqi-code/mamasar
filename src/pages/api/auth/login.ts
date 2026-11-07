import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl } from '../../../lib/neon-auth';
import { findOrCreateUserByGoogle, createSession } from '../../../lib/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const isDemo = url.searchParams.get('demo') === '1';

  // Demo Santri Mode: 1-Click test login
  if (isDemo) {
    const demoUser = findOrCreateUserByGoogle({
      googleId: 'google_demo_1926',
      email: 'warga.santri@sumenep.nu.or.id',
      name: 'Ahmad Fawaid (Warga NU)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    });

    const sessionId = createSession(demoUser.id);
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `mamasar_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );
    headers.set('Location', '/dashboard');

    return new Response(null, {
      status: 302,
      headers,
    });
  }

  // Neon Auth Google Social Login Flow
  try {
    const baseUrl = getNeonAuthBaseUrl();
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
        headers.append('Set-Cookie', sc);
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
