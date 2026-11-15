import type { APIRoute } from 'astro';
import { getUserFromSession, addCashbookEntry, deleteCashbookEntry } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Silakan login terlebih dahulu.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { title, amount, type, category, notes, transactionDate } = body;
    const numericAmount = Math.round(Number(amount));

    if (!title || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ success: false, message: 'Judul dan nominal transaksi yang valid wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Catatan kas berhasil disimpan.',
        entry,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Cashbook POST error:', err);
    return jsonError(500, 'Gagal menyimpan catatan kas.');
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return jsonError(401, 'Silakan login terlebih dahulu.');
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return jsonError(400, 'ID catatan tidak ditemukan.');
    }

    const deleted = await deleteCashbookEntry(Number(id), user.id, user.umkm?.id);
    return new Response(JSON.stringify({ success: deleted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Cashbook DELETE error:', err);
    return jsonError(500, 'Gagal menghapus catatan kas.');
  }
};
