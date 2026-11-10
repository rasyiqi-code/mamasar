import type { APIRoute } from 'astro';
import { getUserFromSession, setupUMKMForUser } from '../../../lib/db';
import { isValidIndonesianPhone } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const sessionId = request.headers
      .get('cookie')
      ?.split(';')
      .find((c) => c.trim().startsWith('mamasar_session='))
      ?.split('=')[1];

    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserFromSession(sessionId);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Sesi login telah berakhir.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();
    const claimStoreId = formData.get('claimStoreId') ? Number(formData.get('claimStoreId')) : undefined;
    const skipClaim = formData.get('skipClaim') === '1';

    if (!name || !phone || !zoneId) {
      return new Response(JSON.stringify({ success: false, message: 'Nama Toko, No. WhatsApp, dan Wilayah MWC wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidIndonesianPhone(phone)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await setupUMKMForUser(
      user.id,
      { name, phone, zoneId, address },
      { claimStoreId, skipClaim }
    );

    if (result.outcome === 'claim_available') {
      return new Response(
        JSON.stringify({
          success: false,
          claim_available: true,
          candidate: result.candidate,
          message: `Nomor WhatsApp ini cocok dengan toko "${result.candidate.name}" di wilayah ${result.candidate.zone_name} — terdaftar dari hasil pendataan petugas lapangan.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (result.outcome === 'claim_failed') {
      return new Response(
        JSON.stringify({ success: false, message: 'Toko tersebut baru saja diambil alih akun lain. Muat ulang halaman, lalu isi ulang profil toko Anda.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        storeId: result.storeId,
        claimed: result.claimed,
        message: result.claimed
          ? 'Alhamdulillah! Toko hasil pendataan kini dikelola lewat akun Anda.'
          : 'Alhamdulillah! Profil toko Anda berhasil disimpan.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
