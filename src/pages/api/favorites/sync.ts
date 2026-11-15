import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { syncGuestFavorites, getUserFavoriteIds } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak login.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const guestIds = Array.isArray(body.productIds) ? body.productIds : [];

    if (guestIds.length > 0) {
      await syncGuestFavorites(user.id, guestIds);
    }

    const currentFavorites = await getUserFavoriteIds(user.id);

    return new Response(
      JSON.stringify({
        success: true,
        favorites: currentFavorites,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Favorites sync error:', err);
    return jsonError(500, 'Gagal menyinkronkan favorit.');
  }
};
