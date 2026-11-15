import { Elysia } from 'elysia';
import {
  approveAdOrder,
  can,
  createAdOrder,
  getAdOrderScope,
  getPackageById,
  isPCNU,
  isProductOwnedByUMKM,
  rejectAdOrder,
} from '../../lib/db';
import { InvalidUploadError, saveUploadedImage } from '../../lib/storage';
import {
  fileField,
  jsonError,
  jsonResponse,
  resolveRequestUser,
  strField,
  type ParsedBody,
} from '../context';

export const promotionsRoutes = new Elysia({ name: 'routes:promotions', prefix: '/promotions' })
  .post('/order', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !user.umkm) {
        return jsonResponse(
          {
            success: false,
            message: 'Silakan masuk ke akun pemilik toko Anda terlebih dahulu.',
          },
          401
        );
      }

      const data = body as ParsedBody;
      const type = strField(data, 'type');
      const rawProductId = strField(data, 'productId');
      const productId = rawProductId ? Number(rawProductId) : undefined;
      const notes = strField(data, 'notes') || undefined;

      if (!type) {
        return jsonResponse(
          { success: false, message: 'Pilih jenis paket promosi iklan terlebih dahulu.' },
          400
        );
      }

      const pkg = getPackageById(type);
      if (!pkg) {
        return jsonResponse({ success: false, message: 'Paket promosi tidak valid.' }, 400);
      }

      if (pkg.category === 'featured') {
        if (!productId || !Number.isInteger(productId) || productId <= 0) {
          return jsonResponse(
            { success: false, message: 'Pilih produk yang ingin dijadikan Iklan Unggulan.' },
            400
          );
        }

        const owned = await isProductOwnedByUMKM(productId, user.umkm.id);
        if (!owned) {
          return jsonResponse(
            {
              success: false,
              message: 'Produk tidak ditemukan atau bukan milik toko Anda.',
            },
            403
          );
        }
      }

      const proofFile = fileField(data, 'proofImage');
      const proofBase64 = typeof data?.proofBase64 === 'string' ? data.proofBase64 : undefined;
      const hasFile = Boolean(proofFile && proofFile.size > 0);
      const hasBase64 = Boolean(proofBase64 && proofBase64.includes(';base64,'));

      if (!hasFile && !hasBase64) {
        return jsonResponse(
          {
            success: false,
            message: 'Bukti pembayaran (QRIS / transfer) wajib diunggah sebelum mengirim pesanan.',
          },
          400
        );
      }

      const proofImageUrl = await saveUploadedImage({
        imageFile: proofFile,
        imageBase64: proofBase64,
      });

      const result = await createAdOrder({
        umkmId: user.umkm.id,
        productId,
        userId: user.id,
        type,
        paymentMethod: 'qris_manual',
        proofImageUrl,
        notes,
      });

      return jsonResponse(
        {
          success: true,
          orderId: result.orderId,
          message:
            'Alhamdulillah! Pesanan promosi iklan Anda telah dikirim dan sedang diverifikasi oleh admin PCNU/MWCNU.',
        },
        201
      );
    } catch (error: any) {
      if (error instanceof InvalidUploadError) {
        return jsonResponse({ success: false, message: error.message }, 400);
      }
      return jsonError(500, 'Terjadi kesalahan server.', error);
    }
  })
  .post('/review', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan masuk terlebih dahulu.' }, 401);
      }

      if (!isPCNU(user) && user.role !== 'mwcnu') {
        return jsonResponse(
          {
            success: false,
            message: 'Akses moderasi promosi khusus Admin PCNU atau Pengurus MWCNU.',
          },
          403
        );
      }

      const data = body as ParsedBody;
      const orderId = Number(strField(data, 'orderId'));
      const action = strField(data, 'action');
      const reason = strField(data, 'reason') || undefined;

      if (!orderId || !action) {
        return jsonResponse(
          { success: false, message: 'ID Pesanan dan tindakan (action) diperlukan.' },
          400
        );
      }

      const scope = await getAdOrderScope(orderId);
      if (!scope) {
        return jsonResponse({ success: false, message: 'Pesanan iklan tidak ditemukan.' }, 404);
      }

      if (!can(user, 'promotion:review', { zoneId: scope.zone_id })) {
        return jsonResponse(
          {
            success: false,
            message: 'Anda hanya dapat meninjau promosi iklan di wilayah MWCNU Anda.',
          },
          403
        );
      }

      if (action === 'approve') {
        const result = await approveAdOrder(orderId, user.id);
        return jsonResponse(result, result.success ? 200 : 400);
      }

      if (action === 'reject') {
        const result = await rejectAdOrder(orderId, user.id, reason);
        return jsonResponse(result, result.success ? 200 : 400);
      }

      return jsonResponse(
        { success: false, message: 'Tindakan tidak valid. Gunakan approve atau reject.' },
        400
      );
    } catch (error) {
      return jsonError(500, 'Terjadi kesalahan server.', error);
    }
  });
