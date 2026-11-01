import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const GET: APIRoute = async ({ params }) => {
  const filePathParam = params.path;

  if (!filePathParam) {
    return new Response('Not found', { status: 404 });
  }

  // Prevent directory traversal
  const safeFilename = path.basename(filePathParam);
  const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
  const fullPath = path.join(uploadsDir, safeFilename);

  if (!fs.existsSync(fullPath)) {
    return new Response('Image not found', { status: 404 });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';

  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.svg') contentType = 'image/svg+xml';

  const fileBuffer = fs.readFileSync(fullPath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
