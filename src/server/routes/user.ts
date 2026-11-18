import { Elysia } from 'elysia';
import {
  addCashbookEntry,
  deleteCashbookEntry,
  deleteUserAccount,
  exportUserAccountData,
  getAllCashbookEntries,
  updateUserProfile,
} from '../../lib/db';
import { isHttpsRequest } from '../../lib/security';
import { InvalidUploadError, saveAccountAvatar } from '../../lib/storage';
import {
  fileField,
  jsonError,
  jsonResponse,
  resolveRequestUser,
  strField,
  type ParsedBody,
} from '../context';

export const userRoutes = new Elysia({ name: 'routes:user', prefix: '/user' })
  .post('/avatar', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ error: 'Silakan login terlebih dahulu.' }, 401);
      }

      const data = body as ParsedBody;
      const imageFile = fileField(data, 'imageFile');
      const imageBase64 = typeof data?.imageBase64 === 'string' ? data.imageBase64 : null;

      if (!imageFile && !imageBase64) {
        return jsonResponse({ error: 'Tidak ada file gambar atau base64 yang dikirim' }, 400);
      }

      const avatarUrl = await saveAccountAvatar({
        imageFile,
        imageBase64,
        userId: user.id,
      });

      await updateUserProfile(user.id, { name: user.name, avatarUrl });

      return jsonResponse(
        {
          success: true,
          message: 'Foto profil berhasil diunggah ke Neon Object Storage',
          avatarUrl,
          storageProvider: 'Neon S3 Object Storage (assets/avatars/)',
        },
        200
      );
    } catch (err: any) {
      if (err instanceof InvalidUploadError) {
        return jsonResponse({ error: err.message }, 400);
      }
      return jsonResponse({ error: 'Gagal mengunggah foto profil' }, 500);
    }
  })
  .post('/cashbook', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
      }

      const data = (body || {}) as Record<string, any>;
      const { title, amount, type, category, notes, transactionDate } = data;
      const numericAmount = Math.round(Number(amount));

      if (!title || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        return jsonResponse(
          { success: false, message: 'Judul dan nominal transaksi yang valid wajib diisi.' },
          400
        );
      }

      const entry = await addCashbookEntry(user.id, {
        umkmId: user.umkm?.id,
        title: String(title).trim(),
        amount: numericAmount,
        type: type === 'expense' ? 'expense' : 'income',
        category: category || 'Penjualan',
        notes,
        transactionDate,
      });

      return jsonResponse({ success: true, message: 'Catatan kas berhasil disimpan.', entry }, 201);
    } catch (err) {
      return jsonError(500, 'Gagal menyimpan catatan kas.', err);
    }
  })
  .delete('/cashbook', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonError(401, 'Silakan login terlebih dahulu.');
      }

      const data = (body || {}) as Record<string, any>;
      const id = data.id;
      if (!id) {
        return jsonError(400, 'ID catatan tidak ditemukan.');
      }

      const deleted = await deleteCashbookEntry(Number(id), user.id, user.umkm?.id);
      return jsonResponse({ success: deleted }, 200);
    } catch (err) {
      return jsonError(500, 'Gagal menghapus catatan kas.', err);
    }
  })
  .get('/cashbook/export', async ({ request }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonError(401, 'Silakan masuk terlebih dahulu untuk mengunduh rekap buku kas.');
      }

      const entries = await getAllCashbookEntries(user.id, user.umkm?.id);
      let csv = '\uFEFFTanggal,Keterangan,Kategori,Jenis,Nominal (Rp),Catatan\r\n';

      for (const entry of entries) {
        const date = entry.transaction_date || '';
        const title = `"${(entry.title || '').replace(/"/g, '""')}"`;
        const category = `"${(entry.category || 'Penjualan').replace(/"/g, '""')}"`;
        const type = entry.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const amountPrefix = entry.type === 'income' ? '' : '-';
        const amount = `${amountPrefix}${entry.amount}`;
        const notes = `"${(entry.notes || '').replace(/"/g, '""')}"`;
        csv += `${date},${title},${category},${type},${amount},${notes}\r\n`;
      }

      const dateTag = new Date().toISOString().slice(0, 10);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Rekap-Kas-Mamasar-${dateTag}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      return jsonError(500, 'Gagal mengekspor laporan kas.', err);
    }
  })
  .get('/export', async ({ request }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonError(401, 'Silakan masuk terlebih dahulu untuk mengunduh data akun Anda.');
      }

      const payload = await exportUserAccountData(user.id);
      if (!payload) {
        return jsonError(404, 'Data akun tidak ditemukan.');
      }

      const dateTag = new Date().toISOString().slice(0, 10);
      return new Response(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="mamasar-data-akun-${user.id}-${dateTag}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      return jsonError(500, 'Gagal mengekspor data akun.', err);
    }
  })
  .post('/delete-account', async ({ request, body }) => {
    try {
      const user = await resolveRequestUser(request);
      if (!user) {
        return jsonError(401, 'Silakan masuk terlebih dahulu.');
      }

      const data = body as ParsedBody;
      const confirmText = strField(data, 'confirmText');
      if (confirmText !== 'HAPUS') {
        return jsonError(
          400,
          'Konfirmasi tidak valid. Ketik HAPUS dengan huruf kapital untuk menghapus akun.'
        );
      }

      await deleteUserAccount(user.id);

      const secureFlag = isHttpsRequest(request) ? '; Secure' : '';
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Set-Cookie', `mamasar_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`);
      headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');

      return new Response(
        JSON.stringify({
          success: true,
          message:
            'Akun beserta data toko, produk, favorit, dan buku kas Anda telah dihapus secara permanen.',
        }),
        { status: 200, headers }
      );
    } catch (err: any) {
      if (err?.message?.includes('Superadmin utama')) {
        return jsonError(403, err.message);
      }
      return jsonError(500, 'Gagal menghapus akun. Silakan hubungi Admin PCNU.', err);
    }
  });
