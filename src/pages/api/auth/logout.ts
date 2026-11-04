import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/db';

export const ALL: APIRoute = async ({ request, redirect }) => {
  const sessionId = request.headers
    .get('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('mamasar_session='))
    ?.split('=')[1];

  if (sessionId) {
    deleteSession(sessionId);
  }

  const headers = new Headers();
  headers.append('Set-Cookie', 'mamasar_session=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  headers.set('Location', '/');

  return new Response(null, {
    status: 302,
    headers,
  });
};
