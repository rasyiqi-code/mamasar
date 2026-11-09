import fs from 'node:fs/promises';
import path from 'node:path';
import ImageKit from 'imagekit';
import { DEFAULT_PRODUCT_IMAGE } from './constants';
import { uploadToNeonStorage, getNeonS3Client, getEnv } from './neon';

const UPLOADS_DIR = path.resolve(process.cwd(), 'data/uploads');
const AVATARS_DIR = path.resolve(process.cwd(), 'data/uploads/avatars');

/**
 * Ensures the uploads directories exist
 */
export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(AVATARS_DIR, { recursive: true });
}

/**
 * Helper to get ImageKit client if configured
 */
function getImageKitClient(): ImageKit | null {
  const publicKey = getEnv('IMAGEKIT_PUBLIC_KEY');
  const privateKey = getEnv('IMAGEKIT_PRIVATE_KEY');
  const urlEndpoint = getEnv('IMAGEKIT_URL_ENDPOINT');

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  return new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });
}

/**
 * 1. Product Images -> ImageKit.io (with local disk fallback)
 * Dedicated for product catalog images with CDN delivery & realtime WebP transformation.
 */
export async function saveProductImage(options: {
  imageFile?: File | null;
  imageBase64?: string | null;
}): Promise<string> {
  const { imageFile, imageBase64 } = options;
  const imagekit = getImageKitClient();

  // Extract file buffer, name, and mime type
  let buffer: Buffer | null = null;
  let fileName = '';

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const ext = path.extname(imageFile.name) || '.jpg';
    fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    buffer = Buffer.from(await imageFile.arrayBuffer());
  } else if (imageBase64 && imageBase64.includes(';base64,')) {
    const commaIndex = imageBase64.indexOf(',');
    if (commaIndex !== -1) {
      const base64Data = imageBase64.substring(commaIndex + 1);
      buffer = Buffer.from(base64Data, 'base64');
      fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    }
  }

  if (!buffer || !fileName) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // Upload to ImageKit if configured
  if (imagekit) {
    try {
      const res = await imagekit.upload({
        file: buffer,
        fileName,
        folder: '/products',
        useUniqueFileName: true,
      });
      return res.url;
    } catch (err) {
      console.warn('ImageKit product upload failed, falling back to local storage:', err);
    }
  }

  // Fallback: Local disk
  await ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

/**
 * Backwards compatibility for product uploads
 */
export const saveUploadedImage = saveProductImage;

/**
 * 2. Account / Profile Photos -> Neon Object Storage (S3)
 * Dedicated for user account avatars, profile pictures, and UMKM store identity.
 */
export async function saveAccountAvatar(options: {
  imageFile?: File | null;
  imageBase64?: string | null;
  userId?: string | number;
}): Promise<string> {
  const { imageFile, imageBase64, userId } = options;
  const useNeonStorage = Boolean(getNeonS3Client());

  let buffer: Buffer | null = null;
  let fileName = '';
  let contentType = 'image/jpeg';

  const userPrefix = userId ? `user-${userId}` : 'avatar';

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const ext = path.extname(imageFile.name) || '.jpg';
    fileName = `avatars/${userPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    buffer = Buffer.from(await imageFile.arrayBuffer());
    contentType = imageFile.type || 'image/jpeg';
  } else if (imageBase64 && imageBase64.includes(';base64,')) {
    const commaIndex = imageBase64.indexOf(',');
    if (commaIndex !== -1) {
      const base64Data = imageBase64.substring(commaIndex + 1);
      buffer = Buffer.from(base64Data, 'base64');
      fileName = `avatars/${userPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
      // Detect content type from base64 header if possible
      if (base64Data.startsWith('data:image/png')) contentType = 'image/png';
      if (base64Data.startsWith('data:image/webp')) contentType = 'image/webp';
    }
  }

  if (!buffer || !fileName) {
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  }

  // Upload to Neon S3 Object Storage
  if (useNeonStorage) {
    try {
      return await uploadToNeonStorage(buffer, fileName, contentType);
    } catch (err) {
      console.warn('Neon S3 avatar upload failed, falling back to local storage:', err);
    }
  }

  // Fallback: Local storage
  await ensureUploadsDir();
  const baseName = path.basename(fileName);
  const filePath = path.join(AVATARS_DIR, baseName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/avatars/${baseName}`;
}
