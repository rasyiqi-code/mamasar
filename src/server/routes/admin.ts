import { Elysia } from 'elysia';
import {
  can,
  createArticle,
  createCaseStudy,
  createOrPreRegisterUserByAdmin,
  deleteArticle,
  deleteCaseStudy,
  deleteUserSessions,
  getArticleById,
  getArticles,
  getCaseStudyById,
  isSuperadmin,
  registerPetugas,
  reviewPetugas,
  updateArticle,
  updateCaseStudy,
  updateUserRoleByAdmin,
  type UserRole,
} from '../../lib/db';
import { isSafeMediaUrl } from '../../lib/security';
import { InvalidUploadError, saveUploadedImage } from '../../lib/storage';
import { isValidIndonesianPhone } from '../../lib/utils';
import {
  fileField,
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
  })
  .get('/admin/articles', async ({ request }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !can(user, 'articles:manage')) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }
      const list = await getArticles();
      return jsonResponse({ success: true, articles: list });
    } catch (err) {
      return jsonError(500, 'Gagal memuat artikel edukasi.', err);
    }
  })
  .post('/admin/articles', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !can(user, 'articles:manage')) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }

      const data = body as ParsedBody;
      const action = strField(data, 'action') || 'create';

      if (action === 'delete') {
        const id = Number(strField(data, 'id'));
        if (!id || !Number.isInteger(id)) {
          return jsonResponse({ success: false, message: 'ID artikel tidak valid.' }, 400);
        }
        const success = await deleteArticle(id);
        if (!success) {
          return jsonResponse({ success: false, message: 'Artikel tidak ditemukan.' }, 404);
        }
        return jsonResponse({ success: true, message: 'Artikel edukasi berhasil dihapus.' }, 200);
      }

      if (action === 'update') {
        const id = Number(strField(data, 'id'));
        if (!id || !Number.isInteger(id)) {
          return jsonResponse({ success: false, message: 'ID artikel tidak valid.' }, 400);
        }

        const existing = await getArticleById(id);
        if (!existing) {
          return jsonResponse({ success: false, message: 'Artikel tidak ditemukan.' }, 404);
        }

        const title = strField(data, 'title');
        const category = strField(data, 'category');
        const summary = strField(data, 'summary');
        const content = typeof data?.content === 'string' ? data.content : undefined;
        let imageUrl = strField(data, 'imageUrl');

        const imageFile = fileField(data, 'image');
        const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : undefined;
        if (imageFile || imageBase64) {
          imageUrl = await saveUploadedImage({ imageFile, imageBase64 });
        } else if (imageUrl && !isSafeMediaUrl(imageUrl)) {
          return jsonResponse(
            { success: false, message: 'URL gambar artikel tidak valid atau tidak aman.' },
            400
          );
        }

        const updated = await updateArticle(id, {
          title: title || undefined,
          category: category || undefined,
          summary: summary || undefined,
          content,
          imageUrl: imageUrl || undefined,
        });

        return jsonResponse(
          { success: true, article: updated, message: 'Artikel edukasi berhasil diperbarui.' },
          200
        );
      }

      const title = strField(data, 'title');
      const category = strField(data, 'category') || 'Edukasi UMKM';
      const summary = strField(data, 'summary');
      const content = typeof data?.content === 'string' ? data.content : undefined;
      let imageUrl = strField(data, 'imageUrl');

      if (!title || !summary) {
        return jsonResponse(
          { success: false, message: 'Judul dan ringkasan artikel wajib diisi.' },
          400
        );
      }

      const imageFile = fileField(data, 'image');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : undefined;
      if (imageFile || imageBase64) {
        imageUrl = await saveUploadedImage({
          imageFile,
          imageBase64,
        });
      } else if (!imageUrl) {
        imageUrl = 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&q=80';
      } else if (!isSafeMediaUrl(imageUrl)) {
        return jsonResponse(
          { success: false, message: 'URL gambar artikel tidak valid atau tidak aman.' },
          400
        );
      }

      const created = await createArticle({
        title,
        category,
        imageUrl,
        summary,
        content,
      });

      return jsonResponse(
        {
          success: true,
          article: created,
          message: 'Alhamdulillah! Artikel edukasi berhasil diterbitkan.',
        },
        201
      );
    } catch (err: any) {
      if (err instanceof InvalidUploadError) {
        return jsonResponse({ success: false, message: err.message }, 400);
      }
      return jsonError(500, 'Terjadi kesalahan server saat memproses artikel.', err);
    }
  })
  .delete('/admin/articles/:id', async ({ request, params }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !can(user, 'articles:manage')) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }

      const id = Number(params?.id);
      if (!id || !Number.isInteger(id)) {
        return jsonResponse({ success: false, message: 'ID artikel tidak valid.' }, 400);
      }

      const success = await deleteArticle(id);
      if (!success) {
        return jsonResponse({ success: false, message: 'Artikel tidak ditemukan.' }, 404);
      }

      return jsonResponse({ success: true, message: 'Artikel edukasi berhasil dihapus.' }, 200);
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server saat menghapus artikel.', err);
    }
  })
  .post('/admin/case-studies', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !can(user, 'articles:manage')) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }

      const data = body as ParsedBody;
      const action = strField(data, 'action');
      const id = Number(strField(data, 'id'));
      const title = strField(data, 'title');
      const channelName = strField(data, 'channelName');
      const tag = strField(data, 'tag') || 'Praktik Lapangan';
      const duration = strField(data, 'duration') || '15 Menit';
      const videoUrl = strField(data, 'videoUrl');
      const thumbnailUrl = strField(data, 'thumbnailUrl');
      const practiceSummary = strField(data, 'practiceSummary');
      const opportunitySummary = strField(data, 'opportunitySummary');
      const sortOrder = Number(strField(data, 'sortOrder')) || 0;
      const isActive = strField(data, 'isActive') === '0' ? 0 : 1;

      if (!title || !channelName || !videoUrl || !thumbnailUrl) {
        return jsonResponse(
          { success: false, message: 'Judul, nama channel, URL video, dan URL thumbnail wajib diisi.' },
          400
        );
      }

      if (!isSafeMediaUrl(thumbnailUrl)) {
        return jsonResponse(
          { success: false, message: 'URL thumbnail video tidak valid atau tidak aman.' },
          400
        );
      }

      if (!isSafeMediaUrl(videoUrl)) {
        return jsonResponse(
          { success: false, message: 'URL video tidak valid atau tidak aman.' },
          400
        );
      }

      if (action === 'update') {
        if (!id || !Number.isInteger(id) || id <= 0) {
          return jsonResponse({ success: false, message: 'ID video tidak valid.' }, 400);
        }

        const existing = await getCaseStudyById(id);
        if (!existing) {
          return jsonResponse({ success: false, message: 'Video studi kasus tidak ditemukan.' }, 404);
        }

        const updated = await updateCaseStudy(id, {
          title,
          channelName,
          tag,
          duration,
          videoUrl,
          thumbnailUrl,
          practiceSummary,
          opportunitySummary,
          sortOrder,
          isActive,
        });

        return jsonResponse(
          { success: true, caseStudy: updated, message: 'Video studi kasus berhasil diperbarui.' },
          200
        );
      }

      const created = await createCaseStudy({
        title,
        channelName,
        tag,
        duration,
        videoUrl,
        thumbnailUrl,
        practiceSummary,
        opportunitySummary,
        sortOrder,
        isActive,
      });

      return jsonResponse(
        { success: true, caseStudy: created, message: 'Video studi kasus berhasil ditambahkan.' },
        201
      );
    } catch (err: any) {
      return jsonError(500, 'Terjadi kesalahan server saat memproses studi kasus.', err);
    }
  })
  .delete('/admin/case-studies/:id', async ({ request, params }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !can(user, 'articles:manage')) {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin / Pengurus PCNU Sumenep.' },
          403
        );
      }

      const id = Number(params?.id);
      if (!id || !Number.isInteger(id)) {
        return jsonResponse({ success: false, message: 'ID video tidak valid.' }, 400);
      }

      const success = await deleteCaseStudy(id);
      if (!success) {
        return jsonResponse({ success: false, message: 'Video studi kasus tidak ditemukan.' }, 404);
      }

      return jsonResponse({ success: true, message: 'Video studi kasus berhasil dihapus.' }, 200);
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server saat menghapus studi kasus.', err);
    }
  });
