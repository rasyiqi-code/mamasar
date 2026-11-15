import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import ImageKit from 'imagekit';
import { DEFAULT_PRODUCT_IMAGE } from './constants';
import { uploadToNeonStorage, getNeonS3Client, getEnv, resolveAvatarUrl } from './neon';

export { resolveAvatarUrl };

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export class InvalidUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUploadError';
  }
}

interface DetectedImageType {
  ext: '.jpg' | '.png' | '.webp';
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

async function extractAndValidateImage(options: {
  imageFile?: File | null;
  imageBase64?: string | null;
}): Promise<{ buffer: Buffer; ext: '.jpg' | '.png' | '.webp'; mime: string } | null> {
  const { imageFile, imageBase64 } = options;
  let buffer: Buffer | null = null;

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    if (imageFile.size > MAX_UPLOAD_BYTES) {
      throw new InvalidUploadError('Ukuran gambar maksimal 2 MB.');
    }
    buffer = Buffer.from(await imageFile.arrayBuffer());
  } else if (imageBase64 && imageBase64.includes(';base64,')) {
    const commaIndex = imageBase64.indexOf(',');
    if (commaIndex !== -1) {
      const base64Data = imageBase64.substring(commaIndex + 1);
      buffer = Buffer.from(base64Data, 'base64');
    }
  }

  if (!buffer || buffer.length === 0) return null;

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new InvalidUploadError('Ukuran gambar maksimal 2 MB.');
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    throw new InvalidUploadError('Format gambar tidak valid. Gunakan JPEG, PNG, atau WebP.');
  }

  return { buffer, ext: detected.ext, mime: detected.mime };
}

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
  const imagekit = getImageKitClient();
  const validated = await extractAndValidateImage(options);

  if (!validated) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const fileName = `prod-${crypto.randomUUID()}${validated.ext}`;

  // Upload to ImageKit if configured
  if (imagekit) {
    try {
      const res = await imagekit.upload({
        file: validated.buffer,
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
  await fs.writeFile(filePath, validated.buffer);
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
  const { userId } = options;
  const useNeonStorage = Boolean(getNeonS3Client());
  const validated = await extractAndValidateImage(options);

  if (!validated) {
    // No image was provided; return an empty value so the UI falls back to
    // initials instead of inventing a stock photo as the user's own face.
    return '';
  }

  const userPrefix = userId ? `user-${userId}` : 'avatar';
  const baseName = `${userPrefix}-${crypto.randomUUID()}${validated.ext}`;
  const fileName = `avatars/${baseName}`;

  // Upload to Neon S3 Object Storage
  if (useNeonStorage) {
    try {
      return await uploadToNeonStorage(validated.buffer, fileName, validated.mime);
    } catch (err) {
      console.warn('Neon S3 avatar upload failed, falling back to local storage:', err);
    }
  }

  // Fallback: Local storage
  await ensureUploadsDir();
  const filePath = path.join(AVATARS_DIR, baseName);
  await fs.writeFile(filePath, validated.buffer);
  return `/uploads/avatars/${baseName}`;
}
