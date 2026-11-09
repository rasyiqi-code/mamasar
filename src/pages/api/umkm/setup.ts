import type { APIRoute } from 'astro';
import { getUserFromSession, createUMKMForUser } from '../../../lib/db';
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

    const storeId = await createUMKMForUser(user.id, {
      name,
      phone,
      zoneId,
      address,
    });

    return new Response(
      JSON.stringify({
        success: true,
        storeId,
        message: 'Alhamdulillah! Profil toko Anda berhasil disimpan.',
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
