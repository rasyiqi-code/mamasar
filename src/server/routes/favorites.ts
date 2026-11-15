import { Elysia } from 'elysia';
import {
  getProductsByIds,
  getUserFavoriteIds,
  syncGuestFavorites,
  toggleUserFavorite,
} from '../../lib/db';
import { jsonError, jsonResponse, resolveRequestUser, type ParsedBody } from '../context';

export const favoritesRoutes = new Elysia({ name: 'routes:favorites', prefix: '/favorites' })
  .get('/list', async ({ query }) => {
    try {
      const idsParam = typeof query.ids === 'string' ? query.ids : '';
      const ids = idsParam
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id) && id > 0)
        .slice(0, 50);

      if (ids.length === 0) {
        return jsonResponse({ success: true, products: [] }, 200);
      }

      const products = await getProductsByIds(ids);
      const slimProducts = products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        zone_name: p.zone_name,
        umkm_name: p.umkm_name,
        umkm_phone: p.umkm_phone,
        is_verified: Boolean(p.is_verified),
        is_featured: Boolean(p.is_featured),
        is_sold_out: Boolean(p.is_sold_out),
        views: p.views ?? 0,
        photo_count: 1 + (Array.isArray(p.gallery_images) ? p.gallery_images.length : 0),
      }));

      return jsonResponse({ success: true, products: slimProducts }, 200);
    } catch (err) {
      return jsonError(500, 'Gagal memuat daftar favorit.', err);
    }
  })
  .post('/toggle', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      const data = body as ParsedBody;
      const productId = Number(data?.productId);

      if (!productId) {
        return jsonResponse({ success: false, message: 'ID Produk diperlukan.' }, 400);
      }

      if (user) {
        const result = await toggleUserFavorite(user.id, productId);
        return jsonResponse(
          {
            success: true,
            favorited: result.favorited,
            syncedWithAccount: true,
          },
          200
        );
      }

      return jsonResponse({ success: true, syncedWithAccount: false }, 200);
    } catch (err) {
      return jsonError(500, 'Gagal memperbarui favorit.', err);
    }
  })
  .post('/sync', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Tidak login.' }, 401);
      }

      const data = body as ParsedBody;
      const guestIds = Array.isArray(data?.productIds) ? data.productIds : [];

      if (guestIds.length > 0) {
        await syncGuestFavorites(user.id, guestIds);
      }

      const currentFavorites = await getUserFavoriteIds(user.id);
      return jsonResponse({ success: true, favorites: currentFavorites }, 200);
    } catch (err) {
      return jsonError(500, 'Gagal menyinkronkan favorit.', err);
    }
  });
