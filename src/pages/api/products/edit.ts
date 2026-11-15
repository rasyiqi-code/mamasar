import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { updateProduct } from '../../../lib/db';
import { InvalidUploadError, saveUploadedImage } from '../../../lib/storage';
import { isSafeMediaUrl, jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);
    if (!user || !user.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan masuk dengan akun pemilik toko.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const productId = Number(formData.get('productId'));
    const name = formData.get('name')?.toString().trim();
    const price = Number(formData.get('price'));
    const category = formData.get('category')?.toString().trim() || 'Makanan & Minuman';
    const description = formData.get('description')?.toString().trim();
    const shopeeUrl = formData.get('shopeeUrl')?.toString()?.trim() || undefined;
    const stockStatus = formData.get('stockStatus')?.toString()?.trim() || undefined;
    const productionCapacity = formData.get('productionCapacity')?.toString()?.trim() || undefined;
    const rawOrigPrice = formData.get('originalPrice')?.toString()?.trim();
    const originalPrice = rawOrigPrice ? Number(rawOrigPrice) : undefined;
    const galleryJson = formData.get('galleryImages')?.toString()?.trim();
    let galleryImages: string[] | undefined = undefined;
    if (galleryJson !== undefined && galleryJson !== '') {
      try {
        const parsed = JSON.parse(galleryJson);
        if (Array.isArray(parsed)) {
          galleryImages = await Promise.all(
            parsed.map(async (item: string) => {
              if (typeof item === 'string' && item.startsWith('data:image')) {
                return await saveUploadedImage({ imageBase64: item });
              }
              return typeof item === 'string' && isSafeMediaUrl(item) ? item : '';
            })
          );
          galleryImages = galleryImages.filter(Boolean);
        }
      } catch (_) {}
    }

    if (!productId || !name || !price) {
      return new Response(JSON.stringify({ success: false, message: 'ID produk, nama, dan harga wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageFile = formData.get('image') as File | null;
    const imageBase64 = formData.get('imageBase64')?.toString();
    let imageUrl: string | undefined = undefined;

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
    });

    if (!success) {
      return new Response(JSON.stringify({ success: false, message: 'Produk tidak ditemukan atau bukan milik toko Anda.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alhamdulillah! Perubahan produk berhasil disimpan.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof InvalidUploadError) {
      return jsonError(400, err.message);
    }
    return jsonError(500, 'Terjadi kesalahan server saat menyimpan perubahan produk.', err);
  }
};
