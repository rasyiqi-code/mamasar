import { Elysia } from 'elysia';
import {
  can,
  createEvent,
  createEventOrder,
  deleteEvent,
  getAllZones,
  getEventById,
  getEventOrderById,
  isPCNU,
  isSuperadmin,
  recordAuditLog,
  updateEvent,
  updateEventOrderStatus,
  type EventInput,
} from '../../lib/db';
import { checkRateLimit, getClientIp } from '../../lib/security';
import { isValidIndonesianPhone } from '../../lib/utils';
import {
  jsonError,
  jsonResponse,
  resolveRequestUser,
  strField,
  type ParsedBody,
} from '../context';

function parseEventForm(
  data: ParsedBody,
  zoneIds: Set<number>
): { ok: true; data: EventInput } | { ok: false; message: string } {
  const title = strField(data, 'title');
  const organizer = strField(data, 'organizer');
  const zoneId = Number(strField(data, 'zoneId'));
  const eventDateRaw = strField(data, 'eventDate');
  const timeDescription = strField(data, 'timeDescription') || strField(data, 'timeDesc');
  const locationName = strField(data, 'locationName');
  const locationAddress = strField(data, 'locationAddress');
  const estimatedAttendance = Number(strField(data, 'estimatedAttendance') || 0);
  const consumptionNeeded = strField(data, 'consumptionNeeded');
  const hasAllowStalls = Boolean(data && typeof data === 'object' && 'allowStalls' in data && data.allowStalls !== undefined);
  const rawAllowStalls = strField(data, 'allowStalls');
  const allowStalls = hasAllowStalls && rawAllowStalls !== '0' && rawAllowStalls !== 'false';
  const coordinatorName = strField(data, 'coordinatorName');
  const coordinatorPhone = strField(data, 'coordinatorPhone');

  if (
    !title ||
    !organizer ||
    !zoneId ||
    !eventDateRaw ||
    !timeDescription ||
    !locationName ||
    !coordinatorPhone
  ) {
    return {
      ok: false,
      message:
        'Judul acara, penyelenggara, wilayah MWC, tanggal & waktu, lokasi, dan nomor WhatsApp koordinator wajib diisi.',
    };
  }

  // Parse tanggal & waktu dengan fallback timezone WIB (UTC+7, Sumenep)
  let isoCandidate = eventDateRaw.trim();
  if (!/[Z+-]\d*(:\d*)?$/.test(isoCandidate) && !isoCandidate.endsWith('Z')) {
    if (isoCandidate.length === 10) isoCandidate = `${isoCandidate}T08:00:00+07:00`;
    else if (isoCandidate.length === 16) isoCandidate = `${isoCandidate}:00+07:00`;
    else if (isoCandidate.length === 19) isoCandidate = `${isoCandidate}+07:00`;
  }
  const eventDate = new Date(isoCandidate);
  if (isNaN(eventDate.getTime())) {
    return { ok: false, message: 'Tanggal & waktu acara tidak valid.' };
  }

  if (!isValidIndonesianPhone(coordinatorPhone)) {
    return {
      ok: false,
      message:
        'Nomor WhatsApp koordinator tidak valid. Masukkan nomor HP Indonesia yang aktif.',
    };
  }

  if (!zoneIds.has(zoneId)) {
    return { ok: false, message: 'Wilayah MWC tidak dikenal — pilih dari daftar yang tersedia.' };
  }

  return {
    ok: true,
    data: {
      title,
      organizer,
      zoneId,
      eventDate,
      timeDescription,
      locationName,
      locationAddress,
      estimatedAttendance:
        Number.isFinite(estimatedAttendance) && estimatedAttendance > 0
          ? Math.round(estimatedAttendance)
          : 0,
      consumptionNeeded,
      allowStalls,
      coordinatorName,
      coordinatorPhone,
    },
  };
}

export const eventsRoutes = new Elysia({ name: 'routes:events', prefix: '/events' })
  .post('/', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }

      if (!isSuperadmin(user) && user.role !== 'mwcnu') {
        return jsonResponse(
          { success: false, message: 'Akses khusus Admin PCNU / Pengurus MWCNU.' },
          403
        );
      }

      const data = body as ParsedBody;
      const action = strField(data, 'action');
      const zoneIds = new Set((await getAllZones()).map((z) => z.id));

      if (action === 'create') {
        const parsed = parseEventForm(data, zoneIds);
        if (!parsed.ok) {
          return jsonResponse({ success: false, message: parsed.message }, 400);
        }

        if (!can(user, 'events:manage', { zoneId: parsed.data.zoneId })) {
          return jsonResponse(
            {
              success: false,
              message: 'Anda hanya dapat mempublikasikan agenda pada wilayah MWCNU Anda.',
            },
            403
          );
        }

        const result = await createEvent(parsed.data);
        return jsonResponse(
          {
            success: true,
            eventId: result.id,
            slug: result.slug,
            message: 'Alhamdulillah! Agenda kegiatan telah dipublikasikan ke direktori.',
          },
          201
        );
      }

      if (action === 'update') {
        const eventId = Number(strField(data, 'eventId'));
        if (!eventId) {
          return jsonResponse({ success: false, message: 'ID agenda diperlukan.' }, 400);
        }

        const existingEvent = await getEventById(eventId);
        if (!existingEvent) {
          return jsonResponse(
            { success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' },
            404
          );
        }

        if (!can(user, 'events:manage', { zoneId: existingEvent.zone_id })) {
          return jsonResponse(
            {
              success: false,
              message: 'Anda hanya dapat mengelola agenda kegiatan pada wilayah MWCNU Anda.',
            },
            403
          );
        }

        const parsed = parseEventForm(data, zoneIds);
        if (!parsed.ok) {
          return jsonResponse({ success: false, message: parsed.message }, 400);
        }

        if (!can(user, 'events:manage', { zoneId: parsed.data.zoneId })) {
          return jsonResponse(
            {
              success: false,
              message: 'Anda tidak dapat memindahkan agenda ke wilayah di luar MWCNU Anda.',
            },
            403
          );
        }

        const success = await updateEvent(eventId, parsed.data);
        if (!success) {
          return jsonResponse(
            { success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' },
            404
          );
        }

        return jsonResponse(
          { success: true, message: 'Agenda kegiatan berhasil diperbarui.' },
          200
        );
      }

      if (action === 'delete') {
        const eventId = Number(strField(data, 'eventId'));
        if (!eventId) {
          return jsonResponse({ success: false, message: 'ID agenda diperlukan.' }, 400);
        }

        const existingEvent = await getEventById(eventId);
        if (!existingEvent) {
          return jsonResponse(
            { success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' },
            404
          );
        }

        if (!can(user, 'events:manage', { zoneId: existingEvent.zone_id })) {
          return jsonResponse(
            {
              success: false,
              message: 'Anda hanya dapat menghapus agenda kegiatan pada wilayah MWCNU Anda.',
            },
            403
          );
        }

        const success = await deleteEvent(eventId);
        if (!success) {
          return jsonResponse(
            { success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' },
            404
          );
        }

        return jsonResponse(
          { success: true, message: 'Agenda kegiatan telah dihapus dari direktori.' },
          200
        );
      }

      return jsonResponse({ success: false, message: 'Aksi tidak dikenal.' }, 400);
    } catch (error) {
      return jsonError(500, 'Terjadi kesalahan server.', error);
    }
  })
  .post('/order', async ({ request, body }) => {
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

      if (!body || typeof body !== 'object') {
        return jsonError(400, 'Format data tidak valid.');
      }

      const data = body as ParsedBody;
      const eventId = Number(data?.eventId);
      const type =
        data?.type === 'stall' ? 'stall' : data?.type === 'consumption' ? 'consumption' : null;
      const senderName = typeof data?.senderName === 'string' ? data.senderName.trim() : '';
      const senderPhone = typeof data?.senderPhone === 'string' ? data.senderPhone.trim() : '';
      const itemDescription =
        typeof data?.itemDescription === 'string' ? data.itemDescription.trim() : '';
      const quantityOrSlots =
        typeof data?.quantityOrSlots === 'string'
          ? data.quantityOrSlots.trim().slice(0, 100)
          : '';

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

      const user = await resolveRequestUser(request);
      const created = await createEventOrder({
        eventId,
        umkmId: user?.umkm?.id ?? null,
        type,
        senderName,
        senderPhone,
        itemDescription,
        quantityOrSlots: quantityOrSlots || undefined,
      });

      return jsonResponse(
        {
          success: true,
          orderId: created.id,
          message:
            'Alhamdulillah, pengajuan Anda terkirim dan menunggu konfirmasi panitia MWC NU.',
        },
        201
      );
    } catch (err) {
      return jsonError(500, 'Terjadi kesalahan saat mengirim pengajuan agenda.', err);
    }
  })
  .patch('/order', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonError(401, 'Silakan login terlebih dahulu.');
      }
      if (!can(user, 'events:manage')) {
        return jsonError(403, 'Akses ditolak. Hanya pengurus atau kader MWC/PCNU yang berwenang.');
      }

      const data = body as ParsedBody;
      const orderId = Number(data?.orderId);
      const status =
        data?.status === 'accepted'
          ? 'accepted'
          : data?.status === 'rejected'
            ? 'rejected'
            : null;

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

      return jsonResponse(
        {
          success: true,
          message:
            status === 'accepted'
              ? 'Pengajuan telah diterima panitia.'
              : 'Pengajuan telah ditolak.',
        },
        200
      );
    } catch (err) {
      return jsonError(500, 'Gagal memperbarui status pengajuan agenda.', err);
    }
  });
