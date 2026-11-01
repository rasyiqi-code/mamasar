import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PRODUCT_IMAGE } from './constants';

const UPLOADS_DIR = path.resolve(process.cwd(), 'data/uploads');

/**
 * Ensures the uploads directory exists
 */
export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/**
 * Handles saving uploaded image from either a File object or client-compressed base64 data URL.
 * Returns the public URL path (/uploads/<filename>).
 */
export async function saveUploadedImage(options: {
  imageFile?: File | null;
  imageBase64?: string | null;
}): Promise<string> {
  await ensureUploadsDir();

  const { imageFile, imageBase64 } = options;

  // Case 1: Standard File upload
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const ext = path.extname(imageFile.name) || '.jpg';
    const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return `/uploads/${fileName}`;
  }

  // Case 2: Client-side compressed base64 data URL
  if (imageBase64 && imageBase64.includes(';base64,')) {
    const commaIndex = imageBase64.indexOf(',');
    if (commaIndex !== -1) {
      const base64Data = imageBase64.substring(commaIndex + 1);
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      await fs.writeFile(filePath, buffer);
      return `/uploads/${fileName}`;
    }
  }

  // Fallback default image
  return DEFAULT_PRODUCT_IMAGE;
}
