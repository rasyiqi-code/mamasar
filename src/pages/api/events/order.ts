import type { APIRoute } from 'astro';
import {
  getUserFromSession,
  getEventById,
  createEventOrder,
  getEventOrderById,
  updateEventOrderStatus,
  can,
  isPCNU,
  recordAuditLog,
} from '../../../lib/db';
import { checkRateLimit, getClientIp, jsonError } from '../../../lib/security';
import { isValidIndonesianPhone } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(`event-order:${clientIp}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(
        429,
        `Terlalu banyak pengajuan dalam waktu singkat. Coba lagi dalam ${limit.retryAfterSeconds} detik.`,
        undefined,
        { 'Retry-After': String(limit.retryAfterSeconds) }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError(400, 'Format data tidak valid.');
    }

    const eventId = Number(body.eventId);
    const type = body.type === 'stall' ? 'stall' : body.type === 'consumption' ? 'consumption' : null;
    const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : '';
    const senderPhone = typeof body.senderPhone === 'string' ? body.senderPhone.trim() : '';
    const itemDescription = typeof body.itemDescription === 'string' ? body.itemDescription.trim() : '';
    const quantityOrSlots = typeof body.quantityOrSlots === 'string' ? body.quantityOrSlots.trim().slice(0, 100) : '';

    if (!Number.isInteger(eventId) || eventId <= 0 || !type) {
      return jsonError(400, 'ID kegiatan dan jenis pengajuan wajib valid.');
    }

    if (senderName.length < 2 || senderName.length > 80) {
      return jsonError(400, 'Nama pengaju atau toko minimal 2 karakter (maksimal 80 karakter).');
    }

    if (!isValidIndonesianPhone(senderPhone)) {
      return jsonError(400, 'Nomor WhatsApp tidak valid. Masukkan nomor HP Indonesia yang aktif.');
    }

    if (itemDescription.length < 5 || itemDescription.length > 400) {
      return jsonError(400, 'Deskripsi penawaran/lapak wajib diisi (5–400 karakter).');
    }

    const event = await getEventById(eventId);
    if (!event) {
      return jsonError(404, 'Agenda kegiatan tidak ditemukan.');
    }

    if (type === 'stall' && !event.allow_stalls) {
      return jsonError(400, 'Panitia belum membuka pendaftaran lapak bazar untuk acara ini.');
    }

    const sessionId = cookies.get('mamasar_session')?.value;
    const user = sessionId ? await getUserFromSession(sessionId) : null;

    const created = await createEventOrder({
      eventId,
      umkmId: user?.umkm?.id ?? null,
      type,
      senderName,
      senderPhone,
      itemDescription,
      quantityOrSlots: quantityOrSlots || undefined,
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: created.id,
        message: 'Alhamdulillah, pengajuan Anda terkirim dan menunggu konfirmasi panitia MWC NU.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return jsonError(500, 'Terjadi kesalahan saat mengirim pengajuan agenda.', err);
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionId = cookies.get('mamasar_session')?.value;
    const user = sessionId ? await getUserFromSession(sessionId) : null;
    if (!user) {
      return jsonError(401, 'Silakan login terlebih dahulu.');
    }
    if (!can(user, 'events:manage')) {
      return jsonError(403, 'Akses ditolak. Hanya pengurus atau kader MWC/PCNU yang berwenang.');
    }

    const body = await request.json().catch(() => null);
    const orderId = Number(body?.orderId);
    const status = body?.status === 'accepted' ? 'accepted' : body?.status === 'rejected' ? 'rejected' : null;

    if (!Number.isInteger(orderId) || orderId <= 0 || !status) {
      return jsonError(400, 'ID pengajuan dan status baru (accepted/rejected) wajib valid.');
    }

    const order = await getEventOrderById(orderId);
    if (!order) {
      return jsonError(404, 'Data pengajuan tidak ditemukan.');
    }

    if (!isPCNU(user) && user.assigned_zone_id !== order.zone_id) {
      return jsonError(403, 'Anda hanya dapat mengelola pengajuan pada wilayah MWC Anda.');
    }

    const ok = await updateEventOrderStatus(orderId, status);
    if (!ok) {
      return jsonError(404, 'Gagal memperbarui status pengajuan.');
    }

    await recordAuditLog({
      actorUserId: user.id,
      action: status === 'accepted' ? 'event_order.accept' : 'event_order.reject',
      targetType: 'event_order',
      targetId: orderId,
      metadata: { event_id: order.event_id, status },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: status === 'accepted' ? 'Pengajuan telah diterima panitia.' : 'Pengajuan telah ditolak.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return jsonError(500, 'Gagal memperbarui status pengajuan agenda.', err);
  }
};
