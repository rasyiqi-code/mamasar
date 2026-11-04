import type { APIRoute } from 'astro';
import { toggleProductStock, getUserFromSession } from '../../../lib/db';
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

    const correctPin = process.env.AGENT_PIN || DEFAULT_AGENT_PIN;
    const isAgent = agentPin === correctPin;
    const user = sessionId ? getUserFromSession(sessionId) : null;

    if (!isAgent && !user?.umkm) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak memiliki izin untuk mengubah status produk ini.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const umkmId = isAgent ? undefined : user?.umkm?.id;
    const result = toggleProductStock(productId, umkmId);

    if (result.success) {
      const statusLabel = result.is_sold_out === 1 ? 'Habis Terjual' : 'Tersedia';
      return new Response(
        JSON.stringify({
          success: true,
          is_sold_out: result.is_sold_out,
          message: `Status produk berhasil diubah menjadi: ${statusLabel}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Produk tidak ditemukan.' }), {
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
