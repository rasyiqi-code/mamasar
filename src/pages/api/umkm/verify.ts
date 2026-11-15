import type { APIRoute } from 'astro';
import { can, getUMKMScope, getUserFromSession, isPCNU, setUMKMVerified } from '../../../lib/db';

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
    const verified = formData.get('verified')?.toString() === '1';
    const note = formData.get('note')?.toString().trim() || undefined;

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

    if (!can(user, 'umkm:verify', { zoneId: scope.zone_id })) {
      return new Response(
        JSON.stringify({ success: false, message: 'Anda hanya dapat memverifikasi toko pada wilayah MWCNU Anda.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = await setUMKMVerified(umkmId, verified, { actorUserId: user.id, note });

    if (!success) {
      return new Response(JSON.stringify({ success: false, message: 'Toko tidak ditemukan.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: verified
          ? 'Alhamdulillah! Toko telah diverifikasi — badge Verified tampil di katalog.'
          : 'Verifikasi toko telah dicabut.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
