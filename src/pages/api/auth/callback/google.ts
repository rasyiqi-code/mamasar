import type { APIRoute } from 'astro';
import { findOrCreateUserByGoogle, createSession } from '../../../../lib/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return redirect('/dashboard?error=auth_failed');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return redirect('/dashboard?error=missing_credentials');
  }

  try {
    // 1. Exchange authorization code for tokens
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
      return redirect('/dashboard?error=token_exchange_failed');
    }

    // 2. Fetch user profile from Google UserInfo API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok || !userInfo.sub || !userInfo.email) {
      return redirect('/dashboard?error=profile_fetch_failed');
    }

    // 3. Find or register user in local database
    const user = findOrCreateUserByGoogle({
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      avatarUrl: userInfo.picture,
    });

    // 4. Create session and attach secure cookie
    const sessionId = createSession(user.id);
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
  } catch (err: any) {
    console.error('OAuth Callback Exception:', err);
    return redirect('/dashboard?error=server_error');
  }
};
