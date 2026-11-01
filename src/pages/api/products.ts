import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createUMKMAndProduct } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const agentPin = formData.get('agentPin')?.toString().trim();
    const correctPin = process.env.AGENT_PIN || '1926';

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

    // Handle persistent image storage in data/uploads/
    let imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
    const imageFile = formData.get('image');
    const imageBase64 = formData.get('imageBase64')?.toString();

    const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const ext = path.extname(imageFile.name) || '.jpg';
      const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${fileName}`;
    } else if (imageBase64 && imageBase64.includes(';base64,')) {
      // Decode compressed client-side base64 reliably
      const commaIndex = imageBase64.indexOf(',');
      if (commaIndex !== -1) {
        const base64Data = imageBase64.substring(commaIndex + 1);
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, buffer);
        imageUrl = `/uploads/${fileName}`;
      }
    }

    const result = createUMKMAndProduct({
      umkmName,
      phone,
      zoneId,
      address,
      productName,
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
