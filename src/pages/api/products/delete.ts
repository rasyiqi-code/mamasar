import type { APIRoute } from 'astro';
import { deleteProduct, getUserFromSession } from '../../../lib/db';

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

    // Only the store owner may delete their own products.
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user?.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak memiliki izin untuk menghapus produk ini.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = await deleteProduct(productId, user.umkm.id);

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Produk berhasil dihapus dari katalog.',
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
