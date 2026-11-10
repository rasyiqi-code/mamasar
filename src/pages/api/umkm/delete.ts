import type { APIRoute } from 'astro';
import { getUserFromSession, deleteUMKM } from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Hanya pengurus MWC (users.role = 'pengurus') boleh menghapus toko.
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user.role !== 'pengurus') {
      return new Response(JSON.stringify({ success: false, message: 'Aksi ini khusus pengurus MWC.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const umkmId = Number(formData.get('umkmId'));

    if (!umkmId) {
      return new Response(JSON.stringify({ success: false, message: 'ID Toko diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Produk ikut terhapus lewat FK cascade; akun pemilik (bila ada) tetap utuh.
    const success = await deleteUMKM(umkmId);

    if (!success) {
      return new Response(JSON.stringify({ success: false, message: 'Toko tidak ditemukan.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Toko dan seluruh produknya telah dihapus.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
