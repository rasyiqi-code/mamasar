import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const GET: APIRoute = async ({ params }) => {
  const filePathParam = params.path;

  if (!filePathParam) {
    return new Response('Not found', { status: 404 });
  }

  // Prevent directory traversal while supporting subdirectories (e.g. logos/, avatars/)
  const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
  const relativePath = filePathParam.replace(/^\/+/, '');
  const fullPath = path.resolve(uploadsDir, relativePath);

  if (!fullPath.startsWith(uploadsDir + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return new Response('Image not found', { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  let contentType = 'application/octet-stream';

  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else {
    return new Response('Unsupported file type', { status: 403 });
  }

  const fileBuffer = fs.readFileSync(fullPath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
