import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhoneForWhatsApp,
  getImageSrcSet,
  getMarketplaceInfo,
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

  it('detects diverse marketplaces and external store links correctly', () => {
    // Shopee
    const shopee = getMarketplaceInfo('https://shopee.co.id/product/123/456');
    assert.equal(shopee?.name, 'Shopee');
    assert.equal(shopee?.label, 'Beli di Shopee');
    assert.ok(shopee?.bgClass.includes('#ee4d2d'));

    // Tokopedia
    const tokopedia = getMarketplaceInfo('https://www.tokopedia.com/toko-nu/rengginang');
    assert.equal(tokopedia?.name, 'Tokopedia');
    assert.equal(tokopedia?.label, 'Beli di Tokopedia');
    assert.ok(tokopedia?.bgClass.includes('#03ac0e'));

    // TikTok Shop
    const tiktok = getMarketplaceInfo('https://www.tiktok.com/@toko.nu/video/123');
    assert.equal(tiktok?.name, 'TikTok Shop');
    assert.equal(tiktok?.label, 'Beli di TikTok Shop');

    // Lazada
    const lazada = getMarketplaceInfo('https://www.lazada.co.id/products/item.html');
    assert.equal(lazada?.name, 'Lazada');
    assert.equal(lazada?.label, 'Beli di Lazada');

    // General Web / Instagram / Linktree
    const generic = getMarketplaceInfo('https://toko-madura.com/produk');
    assert.equal(generic?.name, 'Toko Online');
    assert.equal(generic?.label, 'Buka Toko Online');

    // Empty URL
    assert.equal(getMarketplaceInfo(''), null);
    assert.equal(getMarketplaceInfo(undefined), null);
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

  it('correctly handles gallery images JSON parsing and array representation', async () => {
    const { toProduct } = await import('../src/lib/modules/products.ts');

    const mockRow: any = {
      id: 1,
      umkm_id: 1,
      umkm_name: 'Toko NU',
      umkm_phone: '081234567890',
      zone_id: 1,
      zone_name: 'Kota Sumenep',
      zone_slug: 'kota-sumenep',
      name: 'Produk Uji Multi-Foto',
      slug: 'produk-uji-multi-foto',
      price: 15000,
      category: 'Makanan & Minuman',
      image_url: 'https://ik.imagekit.io/mamasar/products/main.jpg',
      gallery_images: JSON.stringify([
        'https://ik.imagekit.io/mamasar/products/foto2.jpg',
        'https://ik.imagekit.io/mamasar/products/foto3.jpg',
      ]),
      created_at: new Date(),
    };

    const prod = toProduct(mockRow);
    assert.ok(Array.isArray(prod.gallery_images));
    assert.equal(prod.gallery_images.length, 2);
    assert.equal(prod.gallery_images[0], 'https://ik.imagekit.io/mamasar/products/foto2.jpg');
    assert.equal(prod.gallery_images[1], 'https://ik.imagekit.io/mamasar/products/foto3.jpg');

    // Total photos should be 1 (main) + 2 (gallery) = 3
    const totalPhotos = 1 + (Array.isArray(prod.gallery_images) ? prod.gallery_images.length : 0);
    assert.equal(totalPhotos, 3);

    // Empty or null gallery
    const prodEmpty = toProduct({ ...mockRow, gallery_images: null });
    assert.ok(Array.isArray(prodEmpty.gallery_images));
    assert.equal(prodEmpty.gallery_images.length, 0);
  });
});
