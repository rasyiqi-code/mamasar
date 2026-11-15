import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhoneForWhatsApp,
  getImageSrcSet,
  getOptimizedImageUrl,
  isValidIndonesianPhone,
  slugify,
} from '../src/lib/utils.ts';
import {
  InvalidUploadError,
  detectImageType,
  extractAndValidateImage,
} from '../src/lib/storage.ts';

describe('utils: phone, slug, and ImageKit transformations', () => {
  it('validates and normalizes Indonesian mobile numbers', () => {
    assert.equal(isValidIndonesianPhone('081234567890'), true);
    assert.equal(isValidIndonesianPhone('+62 812-3456-7890'), true);
    assert.equal(isValidIndonesianPhone('6281234567890'), true);
    assert.equal(isValidIndonesianPhone('0215551234'), false);
    assert.equal(isValidIndonesianPhone('12345'), false);

    assert.equal(formatPhoneForWhatsApp('0812-3456-7890'), '6281234567890');
    assert.equal(formatPhoneForWhatsApp('+62 812 3456 7890'), '6281234567890');
  });

  it('builds URL-safe slugs', () => {
    assert.equal(slugify('Kue Lapis Legit Sumenep!'), 'kue-lapis-legit-sumenep');
    assert.equal(slugify('  ---Keripik Singkong (Pedas)---  '), 'keripik-singkong-pedas');
  });

  it('optimizes only ImageKit URLs and leaves local URLs unchanged', () => {
    const ik = 'https://ik.imagekit.io/mamasar/produk/batik.jpg';
    const optimized = getOptimizedImageUrl(ik, 400);
    assert.match(optimized, /tr=w-400%2Cf-auto%2Cq-80/);

    const srcset = getImageSrcSet(ik);
    assert.ok(srcset?.includes('400w'));
    assert.ok(srcset?.includes('800w'));

    assert.equal(getOptimizedImageUrl('/uploads/local.jpg', 400), '/uploads/local.jpg');
    assert.equal(getImageSrcSet('/uploads/local.jpg'), undefined);
  });
});

describe('storage: magic-byte detection and size validation', () => {
  it('detects JPEG, PNG, and WebP magic bytes accurately and rejects fake files', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const webp = Buffer.from('524946460000000057454250', 'hex');
    const htmlPayload = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');

    assert.deepEqual(detectImageType(jpeg), { ext: '.jpg', mime: 'image/jpeg' });
    assert.deepEqual(detectImageType(png), { ext: '.png', mime: 'image/png' });
    assert.deepEqual(detectImageType(webp), { ext: '.webp', mime: 'image/webp' });
    assert.equal(detectImageType(htmlPayload), null);
  });

  it('rejects oversized uploads (> 2 MB) and non-image base64 payloads', async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const bigBuffer = Buffer.concat([pngHeader, Buffer.alloc(2 * 1024 * 1024 + 100)]);
    const bigBase64 = `data:image/png;base64,${bigBuffer.toString('base64')}`;

    await assert.rejects(
      () => extractAndValidateImage({ imageBase64: bigBase64 }),
      (err) => err instanceof InvalidUploadError && err.message.includes('2 MB')
    );

    const fakeBase64 = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    await assert.rejects(
      () => extractAndValidateImage({ imageBase64: fakeBase64 }),
      (err) => err instanceof InvalidUploadError && err.message.includes('Format gambar tidak valid')
    );
  });
});
