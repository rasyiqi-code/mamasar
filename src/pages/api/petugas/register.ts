import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { registerPetugas } from '../../../lib/db';
import { isValidIndonesianPhone } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan masuk dengan akun Google atau Email terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const requestedRole = formData.get('requestedRole')?.toString().trim() === 'mwcnu' ? 'mwcnu' : 'ranting';
    const ranting = formData.get('ranting')?.toString().trim() || undefined;
    const org =
      formData.get('org')?.toString().trim() ||
      (requestedRole === 'mwcnu' ? 'Pengurus MWC NU Sumenep' : 'Kader NU Sumenep');

    if (!phone || !zoneId) {
      return new Response(JSON.stringify({ success: false, message: 'Nomor WhatsApp dan Wilayah MWC penugasan wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (requestedRole === 'ranting' && !ranting) {
      return new Response(JSON.stringify({ success: false, message: 'Nama Ranting NU (Desa / Kelurahan) wajib diisi untuk Kader Ranting.' }), {
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

    await registerPetugas(user.id, { phone, zoneId, org, ranting, requestedRole });

    const roleLabel = requestedRole === 'mwcnu' ? 'Pengurus MWC NU' : 'Kader Ranting / Petugas Lapangan';
    return new Response(
      JSON.stringify({
        success: true,
        message: `Alhamdulillah! Pengajuan sebagai ${roleLabel} berhasil dikirim. Mohon menunggu persetujuan Admin PCNU Sumenep.`,
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
