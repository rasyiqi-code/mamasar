import type { APIRoute } from 'astro';
import { saveAccountAvatar } from '../../../lib/storage';
import { updateUserProfile, getUserFromSession } from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('mamasar_session')?.value;
    const user = sessionCookie ? getUserFromSession(sessionCookie) : null;
    const contentType = request.headers.get('content-type') || '';

    let imageFile: File | null = null;
    let imageBase64: string | null = null;
    let userId: string | number = user?.id || 'guest';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      imageFile = formData.get('imageFile') as File;
      imageBase64 = formData.get('imageBase64') as string;
      const targetUserId = formData.get('userId') as string;
      if (targetUserId) {
        userId = targetUserId;
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      imageBase64 = body.imageBase64;
      if (body.userId) {
        userId = body.userId;
      }
    }

    if (!imageFile && !imageBase64) {
      return new Response(JSON.stringify({ error: 'Tidak ada file gambar atau base64 yang dikirim' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save avatar to Neon S3 Object Storage (bucket: assets, prefix: avatars/)
    const avatarUrl = await saveAccountAvatar({ imageFile, imageBase64, userId });

    // If user is authenticated, update their profile avatar in the database
    if (user) {
      updateUserProfile(user.id, {
        name: user.name,
        avatarUrl,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Foto profil berhasil diunggah ke Neon Object Storage',
        avatarUrl,
        storageProvider: 'Neon S3 Object Storage (assets/avatars/)',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || 'Gagal mengunggah foto profil',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
