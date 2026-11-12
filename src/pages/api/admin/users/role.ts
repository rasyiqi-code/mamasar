import type { APIRoute } from 'astro';
import { resolveUser } from '../../../../lib/neon-auth';
import {
  isSuperadmin,
  updateUserRoleByAdmin,
  createOrPreRegisterUserByAdmin,
  type UserRole,
} from '../../../../lib/db';

const ROLE_LABELS: Record<UserRole, string> = {
  pcnu: 'Admin PCNU / Superadmin',
  mwcnu: 'Pengurus MWC NU',
  ranting: 'Kader Ranting',
  warga: 'Warga Biasa',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const currentUser = await resolveUser(request);
    if (!currentUser || !isSuperadmin(currentUser)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const mode = formData.get('mode')?.toString().trim() || 'update';
    const role = formData.get('role')?.toString().trim() as UserRole;
    const rawZoneId = formData.get('zoneId')?.toString().trim();
    const zoneId = rawZoneId ? Number(rawZoneId) : null;
    const ranting = formData.get('ranting')?.toString() ?? null;
    const org = formData.get('org')?.toString() ?? null;
    const phone = formData.get('phone')?.toString() ?? null;

    if (!role || !['warga', 'ranting', 'mwcnu', 'pcnu'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pilih peran akun yang valid.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'create') {
      const name = formData.get('name')?.toString().trim() || '';
      const email = formData.get('email')?.toString().trim() || '';

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
      return new Response(
        JSON.stringify({
          success: true,
          mode: result.mode,
          message:
            result.mode === 'updated'
              ? `Akun ${result.email} sudah terdaftar dan perannya langsung diperbarui menjadi ${roleLabel}.`
              : `Akun ${result.email} berhasil didaftarkan sebagai ${roleLabel}. Saat pemilik email masuk, peran ini langsung aktif.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = Number(formData.get('userId'));
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID akun pengguna tidak ditemukan.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updateUserRoleByAdmin(targetUserId, {
      role,
      zoneId,
      ranting,
      org,
      phone,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Peran pengguna berhasil diperbarui menjadi ${ROLE_LABELS[role]}.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const message = err?.message || 'Terjadi kesalahan server.';
    const status = /wajib|tidak valid|tidak ditemukan|tidak dapat diturunkan/i.test(message) ? 400 : 500;
    return new Response(JSON.stringify({ success: false, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
