import type { APIRoute } from 'astro';
import { resolveUser } from '../../../../lib/neon-auth';
import { isSuperadmin, reviewPetugas, deleteUserSessions } from '../../../../lib/db';
import { jsonError } from '../../../../lib/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user || !isSuperadmin(user)) {
      return jsonError(403, 'Akses khusus Admin / Pengurus PCNU Sumenep.');
    }

    const formData = await request.formData();
    const targetUserId = Number(formData.get('userId'));
    const action = formData.get('action')?.toString() as 'approve' | 'reject';
    const targetRole = formData.get('role')?.toString() === 'mwcnu' ? 'mwcnu' : 'ranting';

    if (!targetUserId || (action !== 'approve' && action !== 'reject')) {
      return jsonError(400, 'ID pengguna dan aksi (approve/reject) diperlukan.');
    }

    await reviewPetugas(targetUserId, action, targetRole);
    await deleteUserSessions(targetUserId);

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
    return jsonError(500, 'Terjadi kesalahan server saat memproses persetujuan kader.', err);
  }
};
