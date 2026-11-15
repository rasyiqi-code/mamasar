import type { APIRoute } from 'astro';
import { deleteUserAccount, getUserFromSession } from '../../../lib/db';
import { isHttpsRequest, jsonError } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? await getUserFromSession(sessionCookie) : null;

    if (!user) {
      return jsonError(401, 'Silakan masuk terlebih dahulu.');
    }

    let confirmText = '';
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      confirmText = (body?.confirmText || '').toString().trim();
    } else {
      const formData = await request.formData();
      confirmText = (formData.get('confirmText') || '').toString().trim();
    }

    if (confirmText !== 'HAPUS') {
      return jsonError(400, 'Konfirmasi tidak valid. Ketik HAPUS dengan huruf kapital untuk menghapus akun.');
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
        message: 'Akun beserta data toko, produk, favorit, dan buku kas Anda telah dihapus secara permanen.',
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    if (err?.message?.includes('Superadmin utama')) {
      return jsonError(403, err.message);
    }
    console.error('Delete account error:', err);
    return jsonError(500, 'Gagal menghapus akun. Silakan hubungi Admin PCNU.');
  }
};
