import type { APIRoute } from 'astro';
import { toggleProductStock, getUserFromSession } from '../../../lib/db';

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

    // Only the store owner may toggle their own products' stock.
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user?.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak memiliki izin untuk mengubah status produk ini.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await toggleProductStock(productId, user.umkm.id);

    if (result.success) {
      const statusLabel = result.is_sold_out === 1 ? 'Habis Terjual' : 'Tersedia';
      return new Response(
        JSON.stringify({
          success: true,
          is_sold_out: result.is_sold_out,
          message: `Status produk berhasil diubah menjadi: ${statusLabel}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Produk tidak ditemukan.' }), {
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
