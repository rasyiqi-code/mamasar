import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { createStoreByPetugas } from '../../../lib/db';
import { isValidIndonesianPhone } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Silakan masuk ke akun petugas/admin terlebih dahulu.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();
    const ranting = formData.get('ranting')?.toString().trim() || undefined;
    const nib = formData.get('nib')?.toString().trim() || undefined;
    const halalCert = formData.get('halalCert')?.toString().trim() || undefined;
    const pirt = formData.get('pirt')?.toString().trim() || undefined;
    const bpom = formData.get('bpom')?.toString().trim() || undefined;
    const otherLegalities = formData.get('otherLegalities')?.toString().trim() || undefined;

    if (!name || !phone || !zoneId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nama Toko, Nomor WhatsApp, dan Wilayah MWC wajib diisi.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidIndonesianPhone(phone)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif (contoh: 08123456789 atau 628123456789).',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await createStoreByPetugas(user.id, {
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

    return new Response(
      JSON.stringify({
        success: true,
        isExisting: result.isExisting,
        store: {
          id: result.storeId,
          name: result.storeName,
          phone: result.phone,
          zoneId: result.zoneId,
          zoneName: result.zoneName,
          address: result.address,
        },
        message: result.isExisting
          ? `Toko "${result.storeName}" dengan nomor WhatsApp ini sudah terdaftar. Lanjut daftarkan produk untuk toko ini.`
          : `Alhamdulillah! Toko "${result.storeName}" berhasil didaftarkan. Silakan lanjut ke Step 2 untuk mengisi produk.`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating store by petugas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Terjadi kesalahan server saat mendaftarkan toko.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
