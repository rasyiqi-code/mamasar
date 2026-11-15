import { Elysia } from 'elysia';
import {
  createOrPreRegisterUserByAdmin,
  deleteUserSessions,
  isSuperadmin,
  registerPetugas,
  reviewPetugas,
  updateUserRoleByAdmin,
  type UserRole,
} from '../../lib/db';
import { isValidIndonesianPhone } from '../../lib/utils';
import {
  jsonError,
  jsonResponse,
  resolveRequestUser,
  strField,
  type ParsedBody,
} from '../context';

const ROLE_LABELS: Record<UserRole, string> = {
  pcnu: 'Admin PCNU / Superadmin',
  mwcnu: 'Pengurus MWC NU',
  ranting: 'Kader Ranting',
  warga: 'Warga Biasa',
};

export const adminRoutes = new Elysia({ name: 'routes:admin' })
  .post('/petugas/register', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse(
          {
            success: false,
            message: 'Silakan masuk dengan akun Google atau Email terlebih dahulu.',
          },
          401
        );
      }

      const data = body as ParsedBody;
      const phone = strField(data, 'phone');
      const zoneId = Number(strField(data, 'zoneId'));
      const requestedRole = strField(data, 'requestedRole') === 'mwcnu' ? 'mwcnu' : 'ranting';
      const ranting = strField(data, 'ranting') || undefined;
      const org =
        strField(data, 'org') ||
        (requestedRole === 'mwcnu' ? 'Pengurus MWC NU Sumenep' : 'Kader NU Sumenep');

      if (!phone || !zoneId) {
        return jsonResponse(
          {
            success: false,
            message: 'Nomor WhatsApp dan Wilayah MWC penugasan wajib diisi.',
          },
          400
        );
      }

      if (requestedRole === 'ranting' && !ranting) {
        return jsonResponse(
          {
            success: false,
            message: 'Nama Ranting NU (Desa / Kelurahan) wajib diisi untuk Kader Ranting.',
          },
          400
        );
      }

      if (!isValidIndonesianPhone(phone)) {
        return jsonResponse(
          {
            success: false,
            message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif.',
          },
          400
        );
      }

      await registerPetugas(user.id, { phone, zoneId, org, ranting, requestedRole });
      const roleLabel =
        requestedRole === 'mwcnu' ? 'Pengurus MWC NU' : 'Kader Ranting / Petugas Lapangan';

      return jsonResponse(
        {
          success: true,
          message: `Alhamdulillah! Pengajuan sebagai ${roleLabel} berhasil dikirim. Mohon menunggu persetujuan Admin PCNU Sumenep.`,
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/admin/petugas/action', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !isSuperadmin(user)) {
        return jsonError(403, 'Akses khusus Admin / Pengurus PCNU Sumenep.');
      }

      const data = body as ParsedBody;
      const targetUserId = Number(strField(data, 'userId'));
      const action = strField(data, 'action') as 'approve' | 'reject';
      const targetRole = strField(data, 'role') === 'mwcnu' ? 'mwcnu' : 'ranting';

      if (!targetUserId || (action !== 'approve' && action !== 'reject')) {
        return jsonError(400, 'ID pengguna dan aksi (approve/reject) diperlukan.');
      }

      await reviewPetugas(targetUserId, action, targetRole);
      await deleteUserSessions(targetUserId);

      const roleLabel = targetRole === 'mwcnu' ? 'Pengurus MWC NU' : 'Kader Ranting';
      return jsonResponse(
        {
          success: true,
          message:
            action === 'approve'
              ? `Alhamdulillah! Pengajuan disetujui sebagai ${roleLabel}.`
              : 'Permohonan kader/pengurus telah ditolak.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server saat memproses persetujuan kader.', err);
    }
  })
  .post('/admin/users/role', async ({ request, body }) => {
    try {
      const currentUser = await resolveRequestUser(request);
      if (!currentUser || !isSuperadmin(currentUser)) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }

      const data = body as ParsedBody;
      const mode = strField(data, 'mode') || 'update';
      const role = strField(data, 'role') as UserRole;
      const rawZoneId = strField(data, 'zoneId');
      const zoneId = rawZoneId ? Number(rawZoneId) : null;
      const ranting = typeof data?.ranting === 'string' ? data.ranting : null;
      const org = typeof data?.org === 'string' ? data.org : null;
      const phone = typeof data?.phone === 'string' ? data.phone : null;

      if (!role || !['warga', 'ranting', 'mwcnu', 'pcnu'].includes(role)) {
        return jsonResponse({ success: false, message: 'Pilih peran akun yang valid.' }, 400);
      }

      if (mode === 'create') {
        const name = strField(data, 'name');
        const email = strField(data, 'email');

        const result = await createOrPreRegisterUserByAdmin({
          name,
          email,
          role,
          zoneId,
          ranting,
          org,
          phone,
        });

        const roleLabel = ROLE_LABELS[role];
        return jsonResponse(
          {
            success: true,
            mode: result.mode,
            message:
              result.mode === 'updated'
                ? `Akun ${result.email} sudah terdaftar dan perannya langsung diperbarui menjadi ${roleLabel}.`
                : `Akun ${result.email} berhasil didaftarkan sebagai ${roleLabel}. Saat pemilik email masuk, peran ini langsung aktif.`,
          },
          200
        );
      }

      const targetUserId = Number(strField(data, 'userId'));
      if (!targetUserId) {
        return jsonResponse(
          { success: false, message: 'ID akun pengguna tidak ditemukan.' },
          400
        );
      }

      await updateUserRoleByAdmin(targetUserId, {
        role,
        zoneId,
        ranting,
        org,
        phone,
      });
      await deleteUserSessions(targetUserId);

      return jsonResponse(
        {
          success: true,
          message: `Peran pengguna berhasil diperbarui menjadi ${ROLE_LABELS[role]}.`,
        },
        200
      );
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (/wajib|tidak valid|tidak ditemukan|tidak dapat diturunkan/i.test(rawMsg)) {
        return jsonError(400, rawMsg, err);
      }
      return jsonError(500, 'Terjadi kesalahan server saat memperbarui peran pengguna.', err);
    }
  });
