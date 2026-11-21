import { Elysia } from 'elysia';
import { eq, ilike, or } from 'drizzle-orm';
import { getDb } from '../../lib/db';
import * as schema from '../../lib/schema';
import { generateStoreSlug } from '../../lib/modules/stores';
import { invalidateCache } from '../../lib/cache';
import { formatPhoneForWhatsApp, slugify } from '../../lib/utils';
import { jsonResponse, type ParsedBody } from '../context';

export interface PekaranganAssetPayload {
  pilar_kategori: string;
  nama_komoditas: string;
  jumlah_estimasi: number;
  media_tanam?: string;
  catatan_produksi?: string;
  publish_to_mamasar?: boolean;
}

export interface PekaranganSyncPayload {
  nama_lengkap: string;
  nama_panggilan?: string;
  nomor_wa: string;
  mwc_zone?: string;
  ranting?: string;
  rt_rw?: string;
  alamat_catatan?: string;
  assets?: PekaranganAssetPayload[];
}

export const pekaranganRoutes = new Elysia({ name: 'routes:pekarangan', prefix: '/pekarangan' })
  /**
   * Endpoint sinkronisasi data dari aplikasi Pekarangan (Fase 3: Jembatan Data Hulu-Hilir)
   * Menyerap produk olahan surplus Pilar 4 (Rumah Produksi Pekarangan / RPP) menjadi etalase UMKM Mamasar
   */
  .post('/sync', async ({ body }) => {
    try {
      const data = body as PekaranganSyncPayload;
      if (!data.nama_lengkap || !data.nomor_wa) {
        return jsonResponse(
          { success: false, message: 'Nama lengkap dan nomor WhatsApp warga wajib disertakan.' },
          400
        );
      }

      const cleanPhone = formatPhoneForWhatsApp(data.nomor_wa);
      const db = getDb();

      // 1. Tentukan Zona MWC
      let zoneId = 1; // Default MWC Kota Sumenep
      if (data.mwc_zone) {
        const zoneMatch = await db
          .select({ id: schema.zones.id })
          .from(schema.zones)
          .where(
            or(
              ilike(schema.zones.name, `%${data.mwc_zone.replace(/^MWC\s*/i, '')}%`),
              ilike(schema.zones.slug, `%${slugify(data.mwc_zone)}%`)
            )
          )
          .limit(1);
        if (zoneMatch.length > 0) {
          zoneId = zoneMatch[0].id;
        }
      }

      // 2. Filter aset yang merupakan olahan RPP atau diminta dipublikasikan ke Mamasar
      const rppAssets = (data.assets || []).filter((a) => {
        const pilar = (a.pilar_kategori || '').toLowerCase();
        return (
          pilar.includes('rumah produksi') ||
          pilar.includes('rpp') ||
          a.publish_to_mamasar === true
        );
      });

      if (rppAssets.length === 0) {
        return jsonResponse({
          success: true,
          message: 'Data pekarangan diterima. Tidak ada produk olahan surplus (RPP) yang dipublikasikan ke pasar Mamasar.',
          data: {
            phone: cleanPhone,
            rppCount: 0,
          },
        });
      }

      // 3. Buat atau temukan toko UMKM berdasarkan nomor WhatsApp
      const existingStores = await db
        .select({ id: schema.umkm.id, name: schema.umkm.name, slug: schema.umkm.slug })
        .from(schema.umkm)
        .where(eq(schema.umkm.phone, cleanPhone))
        .limit(1);

      let targetUmkmId: number;
      let targetUmkmName: string;
      let isNewStore = false;

      if (existingStores.length > 0) {
        targetUmkmId = existingStores[0].id;
        targetUmkmName = existingStores[0].name;
      } else {
        isNewStore = true;
        targetUmkmName = `Dapur RPP ${data.nama_lengkap}`;
        const storeSlug = generateStoreSlug(targetUmkmName);
        const fullAddress = `${data.alamat_catatan ? data.alamat_catatan + ', ' : ''}RT ${data.rt_rw || '-'}`;

        const [createdStore] = await db
          .insert(schema.umkm)
          .values({
            name: targetUmkmName,
            slug: storeSlug,
            phone: cleanPhone,
            zone_id: zoneId,
            ranting: data.ranting || null,
            address: fullAddress,
            is_verified: 0, // Draf verifikasi petugas
            other_legalities: 'Binaan Rumah Produksi Pekarangan (RPP) Warga NU',
          })
          .returning({ id: schema.umkm.id, name: schema.umkm.name });

        targetUmkmId = createdStore.id;
      }

      // 4. Masukkan produk olahan surplus RPP
      const createdProducts = [];
      for (const asset of rppAssets) {
        // Cek apakah produk dengan nama serupa sudah ada di toko ini
        const existingProd = await db
          .select({ id: schema.products.id })
          .from(schema.products)
          .where(
            eq(schema.products.umkm_id, targetUmkmId)
          );

        const prodName = asset.nama_komoditas.trim();
        const uniqueSlug = `${slugify(prodName)}-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`;

        // Tentukan kategori produk olahan
        let category = 'Makanan & Minuman';
        const lowerName = prodName.toLowerCase();
        if (lowerName.includes('jamu') || lowerName.includes('toga') || lowerName.includes('herbal')) {
          category = 'Herbal & Kesehatan';
        }

        const [createdProd] = await db
          .insert(schema.products)
          .values({
            umkm_id: targetUmkmId,
            name: prodName,
            slug: uniqueSlug,
            price: 15000, // Harga patokan awal draf, dapat diubah oleh pemilik di Mamasar
            category: category,
            description: `Produk olahan surplus Rumah Produksi Pekarangan (RPP) keluarga Warga NU. Bahan alami higienis hasil pekarangan lestari. ${asset.catatan_produksi || ''}`.trim(),
            image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            stock_status: 'ready',
            production_capacity: asset.catatan_produksi || `${asset.jumlah_estimasi} batch panen berkala`,
          })
          .returning({ id: schema.products.id, name: schema.products.name, slug: schema.products.slug });

        createdProducts.push(createdProd);
      }

      invalidateCache('products:');
      invalidateCache('stores:');

      return jsonResponse({
        success: true,
        message: isNewStore
          ? `Toko binaan RPP dan ${createdProducts.length} produk olahan berhasil didaftarkan di Mamasar!`
          : `${createdProducts.length} produk olahan baru berhasil ditambahkan ke toko Anda di Mamasar!`,
        data: {
          storeId: targetUmkmId,
          storeName: targetUmkmName,
          isNewStore,
          productsCount: createdProducts.length,
          claimUrl: `/dashboard?phone=${cleanPhone}`,
        },
      });
    } catch (err: any) {
      console.error('[Pekarangan Integration Error]', err);
      return jsonResponse(
        { success: false, message: 'Gagal menghubungkan data pekarangan ke Mamasar: ' + err.message },
        500
      );
    }
  });
