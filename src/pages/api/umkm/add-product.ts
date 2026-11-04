import type { APIRoute } from 'astro';
import { getUserFromSession, addProductToUMKM } from '../../../lib/db';
import { saveUploadedImage } from '../../../lib/storage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const sessionId = request.headers
      .get('cookie')
      ?.split(';')
      .find((c) => c.trim().startsWith('mamasar_session='))
      ?.split('=')[1];

    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserFromSession(sessionId);
    if (!user || !user.umkm) {
      return new Response(
        JSON.stringify({ success: false, message: 'Lengkapi profil toko Anda terlebih dahulu sebelum mengunggah produk.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const price = Number(formData.get('price'));
    const category = formData.get('category')?.toString().trim() || 'Makanan & Minuman';
    const description = formData.get('description')?.toString().trim();

    if (!name || !price) {
      return new Response(JSON.stringify({ success: false, message: 'Nama produk dan harga wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageFile = formData.get('image') as File | null;
    const imageBase64 = formData.get('imageBase64')?.toString();
    const imageUrl = await saveUploadedImage({ imageFile, imageBase64 });

    const result = addProductToUMKM(user.umkm.id, {
      name,
      price,
      category,
      imageUrl,
      description,
    });

    return new Response(
      JSON.stringify({
        success: true,
        slug: result.slug,
        productId: result.productId,
        message: 'Alhamdulillah! Produk berhasil diterbitkan ke katalog.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
