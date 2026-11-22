import { Elysia } from 'elysia';
import {
  addProductToUMKM,
  bumpProduct,
  can,
  createUMKMAndProduct,
  deleteProduct,
  getUMKMByUserId,
  getUMKMScope,
  toggleProductStock,
  updateProduct,
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

async function resolveGalleryImages(
  raw: unknown,
  filterExistingUrl: boolean
): Promise<string[] | undefined> {
  if (!raw) return undefined;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(parsed)) return undefined;

  const items = await Promise.all(
    parsed.map(async (item: unknown) => {
      if (typeof item !== 'string' || !item) return '';
      if (item.startsWith('data:image')) {
        return await saveUploadedImage({ imageBase64: item });
      }
      if (filterExistingUrl) {
        return isSafeMediaUrl(item) ? item : '';
      }
      return item;
    })
  );
  return items.filter(Boolean);
}

export const productsRoutes = new Elysia({ name: 'routes:products', prefix: '/products' })
  .post('/', async ({ request, body }) => {
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
      const rawUmkmId = strField(data, 'umkmId');
      const explicitUmkmId = rawUmkmId ? Number(rawUmkmId) : undefined;
      if (rawUmkmId && (!Number.isInteger(explicitUmkmId) || (explicitUmkmId ?? 0) <= 0)) {
        return jsonResponse({ success: false, message: 'ID toko tidak valid.' }, 400);
      }

      const userStore = await getUMKMByUserId(user.id);

      if (explicitUmkmId !== undefined) {
        const scope = await getUMKMScope(explicitUmkmId);
        if (!scope) {
          return jsonResponse({ success: false, message: 'Toko tujuan tidak ditemukan.' }, 404);
        }

        const actor = { ...user, umkm: userStore ? { id: userStore.id } : user.umkm };
        if (!can(actor, 'product:create', { umkmId: explicitUmkmId, zoneId: scope.zone_id })) {
          return jsonResponse(
            {
              success: false,
              message: 'Anda tidak memiliki izin menambahkan produk ke toko ini.',
            },
            403
          );
        }
      }

      const targetUmkmId = explicitUmkmId ?? userStore?.id ?? user.umkm?.id;
      const productName = strField(data, 'productName');
      const price = Number(strField(data, 'price'));
      const category = strField(data, 'category') || 'Makanan & Minuman';
      const description = strField(data, 'description');

      if (!productName || !Number.isFinite(price) || price <= 0) {
        return jsonResponse(
          { success: false, message: 'Nama produk dan harga valid wajib diisi.' },
          400
        );
      }

      const umkmName = strField(data, 'umkmName');
      const phone = strField(data, 'phone');
      const zoneId = Number(strField(data, 'zoneId'));
      const address = strField(data, 'address');

      if (!targetUmkmId) {
        if (!umkmName || !phone || !zoneId) {
          return jsonResponse(
            {
              success: false,
              message:
                'Profil toko belum ada. Lengkapi nama usaha, WhatsApp, dan wilayah terlebih dahulu.',
            },
            400
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
      }

      const imageFile = fileField(data, 'image');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : undefined;
      const shopeeUrl = strField(data, 'shopeeUrl') || undefined;
      const stockStatus = strField(data, 'stockStatus') || 'ready';
      const productionCapacity = strField(data, 'productionCapacity') || undefined;
      const rawLeadTime = strField(data, 'orderLeadTimeDays');
      const orderLeadTimeDays = rawLeadTime !== '' && !isNaN(Number(rawLeadTime)) ? Number(rawLeadTime) : undefined;
      const rawMinOrder = strField(data, 'minOrder');
      const minOrder = rawMinOrder !== '' && !isNaN(Number(rawMinOrder)) ? Math.max(1, Number(rawMinOrder)) : undefined;
      const rawMaxOrder = strField(data, 'maxOrder');
      const maxOrder = rawMaxOrder !== '' && !isNaN(Number(rawMaxOrder)) ? Number(rawMaxOrder) : undefined;
      const deliveryCoverage = strField(data, 'deliveryCoverage') || undefined;
      const shelfLifeNotes = strField(data, 'shelfLifeNotes') || undefined;
      const rawOrigPrice = strField(data, 'originalPrice');
      const originalPrice =
        rawOrigPrice && Number(rawOrigPrice) > 0 ? Number(rawOrigPrice) : undefined;
      const galleryImages = (await resolveGalleryImages(data?.galleryImages, false)) || [];
      const imageUrl = await saveUploadedImage({ imageFile, imageBase64 });

      if (targetUmkmId) {
        const result = await addProductToUMKM(targetUmkmId, {
          name: productName,
          price,
          originalPrice,
          category,
          imageUrl,
          galleryImages,
          description,
          shopeeUrl,
          stockStatus,
          productionCapacity,
          orderLeadTimeDays,
          minOrder,
          maxOrder,
          deliveryCoverage,
          shelfLifeNotes,
        });

        return jsonResponse(
          {
            success: true,
            slug: result.slug,
            productId: result.productId,
            message: 'Produk berhasil diterbitkan!',
          },
          201
        );
      }

      const result = await createUMKMAndProduct({
        umkmName,
        phone,
        zoneId,
        address,
        productName,
        price,
        originalPrice,
        category,
        imageUrl,
        galleryImages,
        description,
        shopeeUrl,
        stockStatus,
        productionCapacity,
        orderLeadTimeDays,
        minOrder,
        maxOrder,
        deliveryCoverage,
        shelfLifeNotes,
        createdByUserId: user.id,
      });

      return jsonResponse(
        {
          success: true,
          slug: result.slug,
          productId: result.productId,
          message: 'Toko dan produk berhasil dibuat!',
        },
        201
      );
    } catch (error: any) {
      if (error instanceof InvalidUploadError) {
        return jsonResponse({ success: false, message: error.message }, 400);
      }
      if (error?.message?.includes('Nomor WhatsApp toko ini sudah terdaftar')) {
        return jsonResponse({ success: false, message: error.message }, 409);
      }
      return jsonError(500, 'Terjadi kesalahan pada server.', error);
    }
  })
  .post('/edit', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user || !user.umkm) {
        return jsonResponse(
          { success: false, message: 'Silakan masuk dengan akun pemilik toko.' },
          401
        );
      }

      const data = body as ParsedBody;
      const productId = Number(strField(data, 'productId'));
      const name = strField(data, 'name');
      const price = Number(strField(data, 'price'));
      const category = strField(data, 'category') || 'Makanan & Minuman';
      const description = strField(data, 'description');
      const shopeeUrl = strField(data, 'shopeeUrl') || undefined;
      const stockStatus = strField(data, 'stockStatus') || undefined;
      const productionCapacity = strField(data, 'productionCapacity') || undefined;
      const rawLeadTime = strField(data, 'orderLeadTimeDays');
      const orderLeadTimeDays = rawLeadTime !== '' && !isNaN(Number(rawLeadTime)) ? Number(rawLeadTime) : undefined;
      const rawMinOrder = strField(data, 'minOrder');
      const minOrder = rawMinOrder !== '' && !isNaN(Number(rawMinOrder)) ? Math.max(1, Number(rawMinOrder)) : undefined;
      const rawMaxOrder = strField(data, 'maxOrder');
      const maxOrder = rawMaxOrder !== '' && !isNaN(Number(rawMaxOrder)) ? Number(rawMaxOrder) : undefined;
      const deliveryCoverage = strField(data, 'deliveryCoverage') || undefined;
      const shelfLifeNotes = strField(data, 'shelfLifeNotes') || undefined;
      const rawOrigPrice = strField(data, 'originalPrice');
      const originalPrice = rawOrigPrice ? Number(rawOrigPrice) : undefined;
      const galleryImages = await resolveGalleryImages(data?.galleryImages, true);

      if (!productId || !name || !price) {
        return jsonResponse(
          { success: false, message: 'ID produk, nama, dan harga wajib diisi.' },
          400
        );
      }

      const imageFile = fileField(data, 'image');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : undefined;
      let imageUrl: string | undefined;

      if ((imageFile && imageFile.size > 0) || (imageBase64 && imageBase64.includes(';base64,'))) {
        imageUrl = await saveUploadedImage({ imageFile, imageBase64 });
      }

      const success = await updateProduct(productId, user.umkm.id, {
        name,
        price,
        originalPrice,
        category,
        imageUrl,
        galleryImages,
        description,
        shopeeUrl,
        stockStatus,
        productionCapacity,
        orderLeadTimeDays,
        minOrder,
        maxOrder,
        deliveryCoverage,
        shelfLifeNotes,
      });

      if (!success) {
        return jsonResponse(
          { success: false, message: 'Produk tidak ditemukan atau bukan milik toko Anda.' },
          404
        );
      }

      return jsonResponse(
        { success: true, message: 'Alhamdulillah! Perubahan produk berhasil disimpan.' },
        200
      );
    } catch (err: any) {
      if (err instanceof InvalidUploadError) {
        return jsonError(400, err.message);
      }
      return jsonError(500, 'Terjadi kesalahan server saat menyimpan perubahan produk.', err);
    }
  })
  .post('/delete', async ({ request, body }) => {
    try {
      const data = body as ParsedBody;
      const productId = Number(strField(data, 'productId'));
      if (!productId) {
        return jsonResponse({ success: false, message: 'ID Produk diperlukan.' }, 400);
      }

      const user = await resolveRequestUser(request);
      if (!user?.umkm) {
        return jsonResponse(
          { success: false, message: 'Tidak memiliki izin untuk menghapus produk ini.' },
          403
        );
      }

      const success = await deleteProduct(productId, user.umkm.id);
      if (!success) {
        return jsonResponse({ success: false, message: 'Produk tidak ditemukan.' }, 404);
      }

      return jsonResponse(
        { success: true, message: 'Produk berhasil dihapus dari katalog.' },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/bump', async ({ request, body }) => {
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
      const productId = Number(strField(data, 'productId'));
      if (!productId) {
        return jsonResponse({ success: false, message: 'ID Produk diperlukan.' }, 400);
      }

      const result = await bumpProduct(productId, user.umkm.id);
      return jsonResponse(
        {
          success: result.success,
          reason: result.reason,
          remainingCredits: result.remainingCredits,
          message: result.message,
        },
        result.success ? 200 : result.reason === 'insufficient_credits' ? 402 : 400
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  })
  .post('/toggle-stock', async ({ request, body }) => {
    try {
      const data = body as ParsedBody;
      const productId = Number(strField(data, 'productId'));
      if (!productId) {
        return jsonResponse({ success: false, message: 'ID Produk diperlukan.' }, 400);
      }

      const user = await resolveRequestUser(request);
      if (!user?.umkm) {
        return jsonResponse(
          {
            success: false,
            message: 'Tidak memiliki izin untuk mengubah status produk ini.',
          },
          403
        );
      }

      const result = await toggleProductStock(productId, user.umkm.id);
      if (!result.success) {
        return jsonResponse({ success: false, message: 'Produk tidak ditemukan.' }, 404);
      }

      const statusLabel = result.is_sold_out === 1 ? 'Habis Terjual' : 'Tersedia';
      return jsonResponse(
        {
          success: true,
          is_sold_out: result.is_sold_out,
          message: `Status produk berhasil diubah menjadi: ${statusLabel}`,
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan server.', err);
    }
  });
