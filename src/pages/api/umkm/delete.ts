import type { APIRoute } from 'astro';
import { can, deleteUMKM, getUMKMScope, getUserFromSession, isPCNU } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isPCNU(user) && user.role !== 'mwcnu') {
      return new Response(JSON.stringify({ success: false, message: 'Akses khusus Admin PCNU / Pengurus MWCNU.' }), {
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

    const scope = await getUMKMScope(umkmId);
    if (!scope) {
      return new Response(JSON.stringify({ success: false, message: 'Toko tidak ditemukan.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!can(user, 'umkm:delete', { zoneId: scope.zone_id })) {
      return new Response(
        JSON.stringify({ success: false, message: 'Anda hanya dapat menghapus toko pada wilayah MWCNU Anda.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Produk ikut terhapus lewat FK cascade; akun pemilik (bila ada) tetap utuh.
    const success = await deleteUMKM(umkmId, { actorUserId: user.id });

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
    console.error('UMKM delete error:', error);
    return jsonError(500, 'Terjadi kesalahan server.');
  }
};
