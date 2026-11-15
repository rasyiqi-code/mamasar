import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/neon-auth';
import { approveAdOrder, can, getAdOrderScope, isPCNU, rejectAdOrder } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Silakan masuk terlebih dahulu.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isPCNU(user) && user.role !== 'mwcnu') {
      return new Response(
        JSON.stringify({ success: false, message: 'Akses moderasi promosi khusus Admin PCNU atau Pengurus MWCNU.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const orderId = Number(formData.get('orderId'));
    const action = formData.get('action')?.toString().trim();
    const reason = formData.get('reason')?.toString().trim() || undefined;

    if (!orderId || !action) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID Pesanan dan tindakan (action) diperlukan.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const scope = await getAdOrderScope(orderId);
    if (!scope) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pesanan iklan tidak ditemukan.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!can(user, 'promotion:review', { zoneId: scope.zone_id })) {
      return new Response(
        JSON.stringify({ success: false, message: 'Anda hanya dapat meninjau promosi iklan di wilayah MWCNU Anda.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'approve') {
      const result = await approveAdOrder(orderId, user.id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (action === 'reject') {
      const result = await rejectAdOrder(orderId, user.id, reason);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Tindakan tidak valid. Gunakan approve atau reject.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error reviewing ad promotion:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
