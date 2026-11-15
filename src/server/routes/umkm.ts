import { Elysia } from 'elysia';
import {
  addProductToUMKM,
  can,
  createStoreByPetugas,
  deleteUMKM,
  getUMKMScope,
  isPCNU,
  isPetugas,
  setUMKMVerified,
  setupUMKMForUser,
  updateUMKMLogo,
  updateUMKMProfile,
} from '../../lib/db';
import { InvalidUploadError, resolveAvatarUrl, saveStoreLogo, saveUploadedImage } from '../../lib/storage';
import { isValidIndonesianPhone } from '../../lib/utils';
import {
  fileField,
  jsonError,
  jsonResponse,
  resolveRequestUser,
  strField,
  type ParsedBody,
} from '../context';

export const umkmRoutes = new Elysia({ name: 'routes:umkm', prefix: '/umkm' })
  .post('/create', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse(
          { success: false, message: 'Silakan masuk ke akun petugas/admin terlebih dahulu.' },
          401
        );
      }
      if (!isPetugas(user)) {
        return jsonResponse(
          {
            success: false,
            message: 'Akses ditolak. Hanya petugas atau admin yang dapat mendaftarkan toko.',
          },
          403
        );
      }

      const data = body as ParsedBody;
      const name = strField(data, 'name');
      const phone = strField(data, 'phone');
      const zoneId = Number(strField(data, 'zoneId'));
      const address = strField(data, 'address');
      const ranting = strField(data, 'ranting') || undefined;
      const nib = strField(data, 'nib') || undefined;
      const halalCert = strField(data, 'halalCert') || undefined;
      const pirt = strField(data, 'pirt') || undefined;
      const bpom = strField(data, 'bpom') || undefined;
      const otherLegalities = strField(data, 'otherLegalities') || undefined;

      if (!name || !phone || !zoneId) {
        return jsonResponse(
          { success: false, message: 'Nama Toko, Nomor WhatsApp, dan Wilayah MWC wajib diisi.' },
          400
        );
      }

      if (!can(user, 'umkm:create_verified', { zoneId })) {
        return jsonResponse(
          {
            success: false,
            message:
              'Anda hanya dapat mendaftarkan toko terverifikasi pada wilayah MWCNU yang ditugaskan.',
          },
          403
        );
      }

      if (!isValidIndonesianPhone(phone)) {
        return jsonResponse(
          {
            success: false,
            message:
              'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif (contoh: 08123456789 atau 628123456789).',
          },
          400
        );
      }

      const result = await createStoreByPetugas(
        user.id,
        {
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
        },
        { verified: true }
      );

      return jsonResponse(
        {
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
        },
        201
      );
    } catch (error) {
      return jsonError(500, 'Terjadi kesalahan server saat mendaftarkan toko.', error);
    }
  })
  .post('/setup', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }

      const data = body as ParsedBody;
      const name = strField(data, 'name');
      const phone = strField(data, 'phone');
      const zoneId = Number(strField(data, 'zoneId'));
      const address = strField(data, 'address');
      const ranting = strField(data, 'ranting');
      const rawClaimId = strField(data, 'claimStoreId');
      const claimStoreId = rawClaimId ? Number(rawClaimId) : undefined;
      const skipClaim = strField(data, 'skipClaim') === '1';

      if (!name || !phone || !zoneId) {
        return jsonResponse(
          { success: false, message: 'Nama Toko, No. WhatsApp, dan Wilayah MWC wajib diisi.' },
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

      const result = await setupUMKMForUser(
        user.id,
        { name, phone, zoneId, address, ranting },
        { claimStoreId, skipClaim }
      );

      if (result.outcome === 'claim_available') {
        return jsonResponse(
          {
            success: false,
            claim_available: true,
            candidate: result.candidate,
            message: `Nomor WhatsApp ini cocok dengan toko "${result.candidate.name}" di wilayah ${result.candidate.zone_name} — terdaftar dari hasil pendataan petugas lapangan.`,
          },
          200
        );
      }

      if (result.outcome === 'claim_failed') {
        return jsonResponse(
          {
            success: false,
            message:
              'Toko tersebut baru saja diambil alih akun lain. Muat ulang halaman, lalu isi ulang profil toko Anda.',
          },
          409
        );
      }

      return jsonResponse(
        {
          success: true,
          storeId: result.storeId,
          claimed: result.claimed,
          message: result.claimed
            ? 'Alhamdulillah! Toko hasil pendataan kini dikelola lewat akun Anda.'
            : 'Alhamdulillah! Profil toko Anda berhasil disimpan.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/update', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !user.umkm) {
        return jsonResponse(
          { success: false, message: 'Silakan masuk dengan akun pemilik toko.' },
          401
        );
      }

      const data = body as ParsedBody;
      const name = strField(data, 'name');
      const phone = strField(data, 'phone');
      const zoneId = Number(strField(data, 'zoneId'));
      const address = strField(data, 'address');
      const ranting = strField(data, 'ranting');
      const nib = strField(data, 'nib');
      const halalCert = strField(data, 'halalCert');
      const pirt = strField(data, 'pirt');
      const bpom = strField(data, 'bpom');
      const otherLegalities = strField(data, 'otherLegalities');

      if (!name || !phone || !zoneId) {
        return jsonResponse(
          { success: false, message: 'Nama Toko, No. WhatsApp, dan Wilayah MWC wajib diisi.' },
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
        return jsonResponse({ success: false, message: 'Gagal memperbarui profil toko.' }, 404);
      }

      return jsonResponse(
        {
          success: true,
          message: 'Alhamdulillah! Profil dan data legalitas toko Anda berhasil diperbarui.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/logo', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !user.umkm) {
        return jsonResponse(
          { success: false, message: 'Silakan masuk dengan akun pemilik toko.' },
          401
        );
      }

      const data = body as ParsedBody;
      const imageFile = fileField(data, 'imageFile');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : null;

      if (!imageFile && !imageBase64) {
        return jsonResponse(
          { success: false, message: 'Pilih file gambar logo terlebih dahulu (JPEG, PNG, atau WebP).' },
          400
        );
      }

      const rawLogoUrl = await saveStoreLogo({
        imageFile,
        imageBase64,
        storeId: user.umkm.id,
      });

      const saved = await updateUMKMLogo(user.umkm.id, user.id, rawLogoUrl);
      if (!saved) {
        return jsonResponse({ success: false, message: 'Gagal memperbarui logo toko.' }, 404);
      }

      const logoUrl = (await resolveAvatarUrl(rawLogoUrl)) || rawLogoUrl;

      return jsonResponse(
        {
          success: true,
          logoUrl,
          message: 'Logo toko berhasil diperbarui.',
        },
        200
      );
    } catch (err) {
      if (err instanceof InvalidUploadError) {
        return jsonResponse({ success: false, message: err.message }, 400);
      }
      return jsonError(500, 'Terjadi kesalahan server saat mengunggah logo.', err);
    }
  })
  .delete('/logo', async ({ request }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !user.umkm) {
        return jsonResponse(
          { success: false, message: 'Silakan masuk dengan akun pemilik toko.' },
          401
        );
      }

      const updated = await updateUMKMLogo(user.umkm.id, user.id, null);
      if (!updated) {
        return jsonResponse({ success: false, message: 'Gagal menghapus logo toko.' }, 404);
      }

      return jsonResponse(
        {
          success: true,
          message: 'Logo toko berhasil dihapus.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server saat menghapus logo.', err);
    }
  })
  .post('/verify', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }
      if (!isPCNU(user) && user.role !== 'mwcnu') {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin PCNU / Pengurus MWCNU.' },
          403
        );
      }

      const data = body as ParsedBody;
      const umkmId = Number(strField(data, 'umkmId'));
      const verified = strField(data, 'verified') === '1';
      const note = strField(data, 'note') || undefined;

      if (!umkmId) {
        return jsonResponse({ success: false, message: 'ID Toko diperlukan.' }, 400);
      }

      const scope = await getUMKMScope(umkmId);
      if (!scope) {
        return jsonResponse({ success: false, message: 'Toko tidak ditemukan.' }, 404);
      }

      if (!can(user, 'umkm:verify', { zoneId: scope.zone_id })) {
        return jsonResponse(
          {
            success: false,
            message: 'Anda hanya dapat memverifikasi toko pada wilayah MWCNU Anda.',
          },
          403
        );
      }

      const success = await setUMKMVerified(umkmId, verified, { actorUserId: user.id, note });
      if (!success) {
        return jsonResponse({ success: false, message: 'Toko tidak ditemukan.' }, 404);
      }

      return jsonResponse(
        {
          success: true,
          message: verified
            ? 'Alhamdulillah! Toko telah diverifikasi — badge Verified tampil di katalog.'
            : 'Verifikasi toko telah dicabut.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/delete', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }
      if (!isPCNU(user) && user.role !== 'mwcnu') {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin PCNU / Pengurus MWCNU.' },
          403
        );
      }

      const data = body as ParsedBody;
      const umkmId = Number(strField(data, 'umkmId'));
      if (!umkmId) {
        return jsonResponse({ success: false, message: 'ID Toko diperlukan.' }, 400);
      }

      const scope = await getUMKMScope(umkmId);
      if (!scope) {
        return jsonResponse({ success: false, message: 'Toko tidak ditemukan.' }, 404);
      }

      if (!can(user, 'umkm:delete', { zoneId: scope.zone_id })) {
        return jsonResponse(
          {
            success: false,
            message: 'Anda hanya dapat menghapus toko pada wilayah MWCNU Anda.',
          },
          403
        );
      }

      const success = await deleteUMKM(umkmId, { actorUserId: user.id });
      if (!success) {
        return jsonResponse({ success: false, message: 'Toko tidak ditemukan.' }, 404);
      }

      return jsonResponse(
        { success: true, message: 'Toko dan seluruh produknya telah dihapus.' },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/add-product', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }
      if (!user.umkm) {
        return jsonResponse(
          {
            success: false,
            message: 'Lengkapi profil toko Anda terlebih dahulu sebelum mengunggah produk.',
          },
          403
        );
      }

      const data = body as ParsedBody;
      const name = strField(data, 'name');
      const price = Number(strField(data, 'price'));
      const category = strField(data, 'category') || 'Makanan & Minuman';
      const description = strField(data, 'description');

      if (!name || !price) {
        return jsonResponse(
          { success: false, message: 'Nama produk dan harga wajib diisi.' },
          400
        );
      }

      const imageFile = fileField(data, 'image');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : undefined;
      const shopeeUrl = strField(data, 'shopeeUrl') || undefined;
      const imageUrl = await saveUploadedImage({ imageFile, imageBase64 });

      const result = await addProductToUMKM(user.umkm.id, {
        name,
        price,
        category,
        imageUrl,
        description,
        shopeeUrl,
      });

      return jsonResponse(
        {
          success: true,
          slug: result.slug,
          productId: result.productId,
          message: 'Alhamdulillah! Produk berhasil diterbitkan ke katalog.',
        },
        201
      );
    } catch (err: any) {
      if (err instanceof InvalidUploadError) {
        return jsonResponse({ success: false, message: err.message }, 400);
      }
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  });
