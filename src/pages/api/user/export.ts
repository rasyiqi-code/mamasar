import type { APIRoute } from 'astro';
import { exportUserAccountData, getUserFromSession } from '../../../lib/db';
import { jsonError } from '../../../lib/security';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

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
    console.error('Export account data error:', err);
    return jsonError(500, 'Gagal mengekspor data akun.');
  }
};
