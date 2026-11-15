import type { APIRoute } from 'astro';
import { addProductToUMKM, can, createUMKMAndProduct, getUMKMByUserId, getUMKMScope } from '../../lib/db';
import { resolveUser } from '../../lib/neon-auth';
import { InvalidUploadError, saveUploadedImage } from '../../lib/storage';
import { isValidIndonesianPhone } from '../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Silakan masuk dengan akun Google atau Email terlebih dahulu.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();

    const rawUmkmId = formData.get('umkmId')?.toString().trim();
    const explicitUmkmId = rawUmkmId ? Number(rawUmkmId) : undefined;
    if (rawUmkmId && (!Number.isInteger(explicitUmkmId) || (explicitUmkmId ?? 0) <= 0)) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID toko tidak valid.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userStore = await getUMKMByUserId(user.id);

    if (explicitUmkmId !== undefined) {
      const scope = await getUMKMScope(explicitUmkmId);
      if (!scope) {
        return new Response(
          JSON.stringify({ success: false, message: 'Toko tujuan tidak ditemukan.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const actor = { ...user, umkm: userStore ? { id: userStore.id } : user.umkm };
      if (!can(actor, 'product:create', { umkmId: explicitUmkmId, zoneId: scope.zone_id })) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Anda tidak memiliki izin menambahkan produk ke toko ini.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const targetUmkmId = explicitUmkmId ?? userStore?.id ?? user.umkm?.id;

    const productName = formData.get('productName')?.toString().trim();
    const price = Number(formData.get('price'));
    const category = formData.get('category')?.toString().trim() || 'Makanan & Minuman';
    const description = formData.get('description')?.toString().trim();

    if (!productName || !Number.isFinite(price) || price <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nama produk dan harga valid wajib diisi.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate Scenario 2 fields before touching storage when user has no store yet
    const umkmName = formData.get('umkmName')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();

    if (!targetUmkmId) {
      if (!umkmName || !phone || !zoneId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Profil toko belum ada. Lengkapi nama usaha, WhatsApp, dan wilayah terlebih dahulu.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!isValidIndonesianPhone(phone)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif (contoh: 08123456789 atau 628123456789).',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const imageFile = formData.get('image') as File | null;
    const imageBase64 = formData.get('imageBase64')?.toString();
    const shopeeUrl = formData.get('shopeeUrl')?.toString()?.trim() || undefined;
    const stockStatus = formData.get('stockStatus')?.toString()?.trim() || 'ready';
    const productionCapacity = formData.get('productionCapacity')?.toString()?.trim() || undefined;
    const rawOrigPrice = formData.get('originalPrice')?.toString()?.trim();
    const originalPrice = rawOrigPrice && Number(rawOrigPrice) > 0 ? Number(rawOrigPrice) : undefined;
    const galleryJson = formData.get('galleryImages')?.toString()?.trim();
    let galleryImages: string[] = [];
    if (galleryJson) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(galleryJson);
      } catch (_) {}
      if (Array.isArray(parsed)) {
        galleryImages = await Promise.all(
          parsed.map(async (item: string) => {
            if (typeof item === 'string' && item.startsWith('data:image')) {
              return await saveUploadedImage({ imageBase64: item });
            }
            return item;
          })
        );
      }
    }
    const imageUrl = await saveUploadedImage({ imageFile, imageBase64 });

    // SCENARIO 1: Existing Store (Pure Product Creation)
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
      });

      return new Response(
        JSON.stringify({
          success: true,
          slug: result.slug,
          productId: result.productId,
          message: 'Produk berhasil diterbitkan!',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SCENARIO 2: No Store Yet (Store + Product combined creation fallback)
    const result = await createUMKMAndProduct({
      umkmName: umkmName!,
      phone: phone!,
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
      createdByUserId: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        slug: result.slug,
        productId: result.productId,
        message: 'Toko dan produk berhasil dibuat!',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error instanceof InvalidUploadError) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error?.message?.includes('Nomor WhatsApp toko ini sudah terdaftar')) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Error saving product:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Terjadi kesalahan pada server.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
