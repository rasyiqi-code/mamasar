import type { APIRoute } from 'astro';
import { resolveUser } from '../../../../lib/neon-auth';
import { isSuperadmin, reviewPetugas } from '../../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user || !isSuperadmin(user)) {
      return new Response(JSON.stringify({ success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const targetUserId = Number(formData.get('userId'));
    const action = formData.get('action')?.toString() as 'approve' | 'reject';
    const targetRole = formData.get('role')?.toString() === 'mwcnu' ? 'mwcnu' : 'ranting';

    if (!targetUserId || (action !== 'approve' && action !== 'reject')) {
      return new Response(JSON.stringify({ success: false, message: 'ID pengguna dan aksi (approve/reject) diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await reviewPetugas(targetUserId, action, targetRole);

    const roleLabel = targetRole === 'mwcnu' ? 'Pengurus MWC NU' : 'Kader Ranting';
    return new Response(
      JSON.stringify({
        success: true,
        message: action === 'approve'
          ? `Alhamdulillah! Pengajuan disetujui sebagai ${roleLabel}.`
          : 'Permohonan kader/pengurus telah ditolak.',
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
