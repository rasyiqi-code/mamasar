import type { APIRoute } from 'astro';
import { findOrCreateUserByGoogle, createSession } from '../../../lib/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const isDemo = url.searchParams.get('demo') === '1';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/callback/google`;

  // Dev / Demo Mode: if no client ID configured or explicitly requested via ?demo=1
  if (!clientId || isDemo) {
    // Create or login as demo UMKM user
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

  // Production Google OAuth 2.0 Authorization Flow
  const state = Math.random().toString(36).substring(2);
  const scope = encodeURIComponent('openid email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

  return redirect(googleAuthUrl);
};
