import type { APIRoute } from 'astro';
import { getProductsByIds } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const idsParam = url.searchParams.get('ids') || '';
    const ids = idsParam
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id) && id > 0)
      .slice(0, 50); // limit to 50 items

    if (ids.length === 0) {
      return new Response(JSON.stringify({ success: true, products: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ success: true, products: slimProducts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Favorites list error:', err);
    return jsonError(500, 'Gagal memuat daftar favorit.');
  }
};
