import type { APIRoute } from 'astro';
import { bumpProduct } from '../../../lib/db';
import { resolveUser } from '../../../lib/neon-auth';

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
    const productId = Number(formData.get('productId'));

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID Produk diperlukan.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await bumpProduct(productId, user.umkm.id);

    return new Response(
      JSON.stringify({
        success: result.success,
        reason: result.reason,
        remainingCredits: result.remainingCredits,
        message: result.message,
      }),
      {
        status: result.success ? 200 : result.reason === 'insufficient_credits' ? 402 : 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
