import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { updateUMKMProfile } from '../../../lib/db';
import { isValidIndonesianPhone } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user || !user.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan masuk dengan akun pemilik toko.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();
    const ranting = formData.get('ranting')?.toString().trim();
    const nib = formData.get('nib')?.toString().trim();
    const halalCert = formData.get('halalCert')?.toString().trim();
    const pirt = formData.get('pirt')?.toString().trim();
    const bpom = formData.get('bpom')?.toString().trim();
    const otherLegalities = formData.get('otherLegalities')?.toString().trim();

    if (!name || !phone || !zoneId) {
      return new Response(JSON.stringify({ success: false, message: 'Nama Toko, No. WhatsApp, dan Wilayah MWC wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidIndonesianPhone(phone)) {
      return new Response(JSON.stringify({ success: false, message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = await updateUMKMProfile(user.umkm.id, user.id, {
      name,
      phone,
      zoneId,
      address,
      ranting,
      nib,
      halalCert,
      pirt,
      bpom,
      otherLegalities,
    });

    if (!success) {
      return new Response(JSON.stringify({ success: false, message: 'Gagal memperbarui profil toko.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alhamdulillah! Profil dan data legalitas toko Anda berhasil diperbarui.',
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
