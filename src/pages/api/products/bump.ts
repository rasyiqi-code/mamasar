import type { APIRoute } from 'astro';
import { bumpProduct, getUserFromSession } from '../../../lib/db';
import { DEFAULT_AGENT_PIN } from '../../../lib/constants';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const productId = Number(formData.get('productId'));
    const agentPin = formData.get('agentPin')?.toString().trim();
    const sessionId = request.headers.get('cookie')?.split(';').find((c) => c.trim().startsWith('mamasar_session='))?.split('=')[1];

    if (!productId) {
      return new Response(JSON.stringify({ success: false, message: 'ID Produk diperlukan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check authorization: either valid agent PIN OR authenticated store owner
    const correctPin = process.env.AGENT_PIN || DEFAULT_AGENT_PIN;
    const isAgent = agentPin === correctPin;
    const user = sessionId ? await getUserFromSession(sessionId) : null;

    if (!isAgent && !user?.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak memiliki izin untuk menyundul produk ini.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const umkmId = isAgent ? undefined : user?.umkm?.id;
    const success = await bumpProduct(productId, umkmId);

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Alhamdulillah! Iklan produk berhasil disundul ke posisi teratas katalog.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Produk tidak ditemukan atau tidak dapat diperbarui.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
