import type { APIRoute } from 'astro';
import { bumpProduct, getUserFromSession } from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const productId = Number(formData.get('productId'));

    if (!productId) {
      return new Response(JSON.stringify({ success: false, message: 'ID Produk diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only the store owner may bump their own products.
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user?.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak memiliki izin untuk menyundul produk ini.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = await bumpProduct(productId, user.umkm.id);

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Alhamdulillah! Iklan produk berhasil disundul ke posisi teratas katalog.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Produk tidak ditemukan atau tidak dapat diperbarui.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
