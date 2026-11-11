import type { APIRoute } from 'astro';
import { resolveUser } from '../../../../lib/neon-auth';
import { isSuperadmin, reviewPetugas } from '../../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user || (!isSuperadmin(user) && user.role !== 'pengurus')) {
      return new Response(JSON.stringify({ success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const targetUserId = Number(formData.get('userId'));
    const action = formData.get('action')?.toString() as 'approve' | 'reject';

    if (!targetUserId || (action !== 'approve' && action !== 'reject')) {
      return new Response(JSON.stringify({ success: false, message: 'ID pengguna dan aksi (approve/reject) diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await reviewPetugas(targetUserId, action);

    return new Response(
      JSON.stringify({
        success: true,
        message: action === 'approve'
          ? 'Alhamdulillah! Petugas berhasil disetujui dan kini aktif mendata UMKM.'
          : 'Pendaftaran petugas telah ditolak.',
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
