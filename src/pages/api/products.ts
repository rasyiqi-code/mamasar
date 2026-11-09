import type { APIRoute } from 'astro';
import { createUMKMAndProduct } from '../../lib/db';
import { DEFAULT_AGENT_PIN } from '../../lib/constants';
import { saveUploadedImage } from '../../lib/storage';
import { isValidIndonesianPhone } from '../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const agentPin = formData.get('agentPin')?.toString().trim();
    const correctPin = process.env.AGENT_PIN || DEFAULT_AGENT_PIN;

    // Simple security check for field agent submissions
    if (agentPin !== correctPin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'PIN Agen tidak valid. Silakan hubungi koordinator MWC.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const umkmName = formData.get('umkmName')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const zoneId = Number(formData.get('zoneId'));
    const address = formData.get('address')?.toString().trim();
    const productName = formData.get('productName')?.toString().trim();
    const price = Number(formData.get('price'));
    const category = formData.get('category')?.toString().trim() || 'Makanan & Minuman';
    const description = formData.get('description')?.toString().trim();

    if (!umkmName || !phone || !zoneId || !productName || !price) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Semua kolom wajib diisi (Nama Usaha, WA, Wilayah, Nama Produk, Harga).',
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

    // Process image storage via shared storage module
    const imageFile = formData.get('image') as File | null;
    const imageBase64 = formData.get('imageBase64')?.toString();
    const shopeeUrl = formData.get('shopeeUrl')?.toString()?.trim() || undefined;
    const imageUrl = await saveUploadedImage({ imageFile, imageBase64 });

    const result = await createUMKMAndProduct({
      umkmName,
      phone,
      zoneId,
      address,
      productName,
      price,
      category,
      imageUrl,
      description,
      shopeeUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        slug: result.slug,
        productId: result.productId,
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
