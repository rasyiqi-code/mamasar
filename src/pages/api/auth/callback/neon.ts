import type { APIRoute } from 'astro';
import { getNeonAuthBaseUrl } from '../../../../lib/neon-auth';
import { findOrCreateUserByGoogle, createSession } from '../../../../lib/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Neon Auth callback error:', error);
    return redirect(`/dashboard?error=${encodeURIComponent(error)}`);
  }

  const baseUrl = getNeonAuthBaseUrl();
  if (!baseUrl) {
    return redirect('/dashboard?error=neon_auth_unconfigured');
  }
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    // Forward the request to Neon Auth upstream to verify session challenge / verifier
    const upstreamUrl = `${baseUrl}/get-session${url.search}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Origin: url.origin,
        'User-Agent': request.headers.get('user-agent') || 'MamasarApp',
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
    // Forward Neon Auth set-cookie headers
    for (const sc of setCookies) {
      headers.append('Set-Cookie', sc);
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
