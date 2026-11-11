import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { createAdOrder, getPackageById } from '../../../lib/db';
import { saveUploadedImage } from '../../../lib/storage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);

    if (!user || !user.umkm) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Silakan masuk ke akun pemilik toko Anda terlebih dahulu.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const type = formData.get('type')?.toString().trim();
    const productId = formData.get('productId') ? Number(formData.get('productId')) : undefined;
    const notes = formData.get('notes')?.toString().trim() || undefined;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pilih jenis paket promosi iklan terlebih dahulu.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pkg = getPackageById(type);
    if (!pkg) {
      return new Response(
        JSON.stringify({ success: false, message: 'Paket promosi tidak valid.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pkg.category === 'featured' && !productId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pilih produk yang ingin dijadikan Iklan Unggulan.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const proofFile = formData.get('proofImage') as File | null;
    const proofBase64 = formData.get('proofBase64')?.toString();
    let proofImageUrl: string | undefined = undefined;

    if ((proofFile && proofFile.size > 0) || (proofBase64 && proofBase64.includes(';base64,'))) {
      proofImageUrl = await saveUploadedImage({ imageFile: proofFile, imageBase64: proofBase64 });
    }

    const result = await createAdOrder({
      umkmId: user.umkm.id,
      productId,
      userId: user.id,
      type,
      paymentMethod: 'qris_manual',
      proofImageUrl,
      notes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: result.orderId,
        message: 'Alhamdulillah! Pesanan promosi iklan Anda telah dikirim dan sedang diverifikasi oleh admin PCNU.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating ad promotion order:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
