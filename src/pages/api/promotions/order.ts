import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { createAdOrder, getPackageById, isProductOwnedByUMKM } from '../../../lib/db';
import { InvalidUploadError, saveUploadedImage } from '../../../lib/storage';

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

    if (pkg.category === 'featured') {
      if (!productId || !Number.isInteger(productId) || productId <= 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Pilih produk yang ingin dijadikan Iklan Unggulan.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const owned = await isProductOwnedByUMKM(productId, user.umkm.id);
      if (!owned) {
        return new Response(
          JSON.stringify({ success: false, message: 'Produk tidak ditemukan atau bukan milik toko Anda.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const proofFile = formData.get('proofImage') as File | null;
    const proofBase64 = formData.get('proofBase64')?.toString();
    const hasFile = Boolean(proofFile && proofFile.size > 0);
    const hasBase64 = Boolean(proofBase64 && proofBase64.includes(';base64,'));

    if (!hasFile && !hasBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bukti pembayaran (QRIS / transfer) wajib diunggah sebelum mengirim pesanan.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const proofImageUrl = await saveUploadedImage({ imageFile: proofFile, imageBase64: proofBase64 });

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
        message: 'Alhamdulillah! Pesanan promosi iklan Anda telah dikirim dan sedang diverifikasi oleh admin PCNU/MWCNU.',
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
    console.error('Error creating ad promotion order:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
