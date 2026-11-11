import type { APIRoute } from 'astro';
import { createUMKMAndProduct, addProductToUMKM, getUMKMByUserId } from '../../lib/db';
import { resolveUser } from '../../lib/neon-auth';
import { saveUploadedImage } from '../../lib/storage';
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

    // Check if the user already has a store or passed a store ID
    const explicitUmkmId = formData.get('umkmId') ? Number(formData.get('umkmId')) : undefined;
    const userStore = await getUMKMByUserId(user.id);
    const targetUmkmId = explicitUmkmId || userStore?.id || user.umkm?.id;

    const productName = formData.get('productName')?.toString().trim();
    const price = Number(formData.get('price'));
    const category = formData.get('category')?.toString().trim() || 'Makanan & Minuman';
    const description = formData.get('description')?.toString().trim();

    if (!productName || !price) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nama produk dan harga wajib diisi.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      try {
        const parsed = JSON.parse(galleryJson);
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
      } catch (_) {}
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
    const umkmName = formData.get('umkmName')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();

    if (!umkmName || !phone || !zoneId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Profil toko belum ada. Lengkapi nama usaha, WhatsApp, dan wilayah terlebih dahulu.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Strict Indonesian phone number validation for WhatsApp direct-link integrity
    if (!isValidIndonesianPhone(phone)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif (contoh: 08123456789 atau 628123456789).',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
    console.error('Error saving product:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Terjadi kesalahan pada server.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
