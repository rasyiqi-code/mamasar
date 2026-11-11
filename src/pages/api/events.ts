import type { APIRoute } from 'astro';
import { getUserFromSession, getAllZones, createEvent, updateEvent, deleteEvent, isSuperadmin, type EventInput } from '../../lib/db';
import { isValidIndonesianPhone } from '../../lib/utils';

/**
 * Parse and validate the shared event form fields for create/update.
 * The zone list is passed in so an unknown zoneId fails with a clear 400
 * instead of a raw FK-violation 500 from the database.
 */
function parseEventForm(
  formData: FormData,
  zoneIds: Set<number>
): { ok: true; data: EventInput } | { ok: false; message: string } {
  const title = formData.get('title')?.toString().trim();
  const organizer = formData.get('organizer')?.toString().trim();
  const zoneId = Number(formData.get('zoneId'));
  const eventDateRaw = formData.get('eventDate')?.toString().trim();
  const timeDescription = formData.get('timeDescription')?.toString().trim();
  const locationName = formData.get('locationName')?.toString().trim();
  const locationAddress = formData.get('locationAddress')?.toString().trim();
  const estimatedAttendance = Number(formData.get('estimatedAttendance') || 0);
  const consumptionNeeded = formData.get('consumptionNeeded')?.toString().trim();
  const allowStalls = formData.get('allowStalls') !== null;
  const coordinatorName = formData.get('coordinatorName')?.toString().trim();
  const coordinatorPhone = formData.get('coordinatorPhone')?.toString().trim();

  if (!title || !organizer || !zoneId || !eventDateRaw || !timeDescription || !locationName || !coordinatorPhone) {
    return { ok: false, message: 'Judul acara, penyelenggara, wilayah MWC, tanggal & waktu, lokasi, dan nomor WhatsApp koordinator wajib diisi.' };
  }

  // Konvensi waktu aplikasi: input datetime-local ("YYYY-MM-DDTHH:mm")
  // disimpan sebagai wall-clock UTC (mengikuti konvensi SEED_EVENTS), sehingga
  // tampilan tanggal di server produksi (UTC) tidak bergeser.
  const eventDate = new Date(`${eventDateRaw}${eventDateRaw.length === 16 ? ':00' : ''}Z`);
  if (isNaN(eventDate.getTime())) {
    return { ok: false, message: 'Tanggal & waktu acara tidak valid.' };
  }

  if (!isValidIndonesianPhone(coordinatorPhone)) {
    return { ok: false, message: 'Nomor WhatsApp koordinator tidak valid. Masukkan nomor HP Indonesia yang aktif.' };
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
      estimatedAttendance: Number.isFinite(estimatedAttendance) && estimatedAttendance > 0 ? Math.round(estimatedAttendance) : 0,
      consumptionNeeded,
      allowStalls,
      coordinatorName,
      coordinatorPhone,
    },
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Hanya Superadmin atau Pengurus boleh mengelola agenda.
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isSuperadmin(user) && user.role !== 'pengurus') {
      return new Response(JSON.stringify({ success: false, message: 'Akses khusus Admin / Pengurus MWC.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const action = formData.get('action')?.toString();
    // Daftar zona valid dimuat sekali untuk validasi zoneId create/update.
    const zoneIds = new Set((await getAllZones()).map((z) => z.id));

    if (action === 'create') {
      const parsed = parseEventForm(formData, zoneIds);
      if (!parsed.ok) {
        return new Response(JSON.stringify({ success: false, message: parsed.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await createEvent(parsed.data);
      return new Response(
        JSON.stringify({
          success: true,
          eventId: result.id,
          slug: result.slug,
          message: 'Alhamdulillah! Agenda kegiatan telah dipublikasikan ke direktori.',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      const eventId = Number(formData.get('eventId'));
      if (!eventId) {
        return new Response(JSON.stringify({ success: false, message: 'ID agenda diperlukan.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const parsed = parseEventForm(formData, zoneIds);
      if (!parsed.ok) {
        return new Response(JSON.stringify({ success: false, message: parsed.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const success = await updateEvent(eventId, parsed.data);
      if (!success) {
        return new Response(JSON.stringify({ success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Agenda kegiatan berhasil diperbarui.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const eventId = Number(formData.get('eventId'));
      if (!eventId) {
        return new Response(JSON.stringify({ success: false, message: 'ID agenda diperlukan.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const success = await deleteEvent(eventId);
      if (!success) {
        return new Response(JSON.stringify({ success: false, message: 'Agenda tidak ditemukan — mungkin sudah dihapus.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Agenda kegiatan telah dihapus dari direktori.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, message: 'Aksi tidak dikenal.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
