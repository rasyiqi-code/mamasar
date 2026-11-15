import crypto from 'node:crypto';
import type { APIRoute } from 'astro';
import { expireStalePromotions, isPCNU } from '../../../lib/db';
import { getEnv } from '../../../lib/neon';
import { resolveUser } from '../../../lib/neon-auth';

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = getEnv('CRON_SECRET');
  const authHeader = request.headers.get('authorization') || '';
  if (cronSecret && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const expected = Buffer.from(cronSecret);
    const actual = Buffer.from(token);
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      return true;
    }
  }

  const user = await resolveUser(request);
  return isPCNU(user);
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthorized(request))) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await expireStalePromotions();
  return new Response(JSON.stringify({ success: true, ...result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async (context) => {
  // Vercel Cron invokes configured paths via GET with Authorization: Bearer <CRON_SECRET>
  return POST(context);
};
