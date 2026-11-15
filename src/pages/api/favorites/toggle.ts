import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { toggleUserFavorite } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    const body = await request.json();
    const productId = Number(body.productId);

    if (!productId) {
      return new Response(JSON.stringify({ success: false, message: 'ID Produk diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user) {
      const result = await toggleUserFavorite(user.id, productId);
      return new Response(
        JSON.stringify({
          success: true,
          favorited: result.favorited,
          syncedWithAccount: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Guest user (not logged in) - client will manage in localStorage
    return new Response(
      JSON.stringify({
        success: true,
        syncedWithAccount: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Favorites toggle error:', err);
    return jsonError(500, 'Gagal memperbarui favorit.');
  }
};
