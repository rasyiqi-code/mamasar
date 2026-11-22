import { and, asc, desc, eq, getTableColumns, gt, gte, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp, slugify } from '../utils';
import { getOrSetCache, invalidateCache } from '../cache';
import type { Product } from './types';
import { generateStoreSlug } from './stores';
import { resolveAvatarUrl } from '../neon';

function invalidateCatalogCaches() {
  invalidateCache('products:');
  invalidateCache('stores:');
  invalidateCache('zones:');
}

export async function resolveProductStoreLogos(items: Product[]): Promise<Product[]> {
  if (items.length === 0) return items;
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      umkm_logo_url: (await resolveAvatarUrl(item.umkm_logo_url)) ?? undefined,
    }))
  );
}

export type ProductRow = typeof schema.products.$inferSelect & {
  umkm_slug?: string | null;
  umkm_name: string;
  umkm_logo_url?: string | null;
  umkm_phone: string;
  umkm_address: string | null;
  umkm_ranting?: string | null;
  umkm_nib?: string | null;
  umkm_halal_cert?: string | null;
  umkm_pirt?: string | null;
  umkm_bpom?: string | null;
  umkm_maps_url?: string | null;
  umkm_qris_image_url?: string | null;
  is_verified: number | null;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
};

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    umkm_id: row.umkm_id,
    umkm_slug: row.umkm_slug ?? undefined,
    umkm_name: row.umkm_name,
    umkm_logo_url: row.umkm_logo_url ?? undefined,
    umkm_phone: row.umkm_phone,
    umkm_address: row.umkm_address ?? '',
    umkm_ranting: row.umkm_ranting ?? undefined,
    umkm_nib: row.umkm_nib ?? undefined,
    umkm_halal_cert: row.umkm_halal_cert ?? undefined,
    umkm_pirt: row.umkm_pirt ?? undefined,
    umkm_bpom: row.umkm_bpom ?? undefined,
    umkm_maps_url: row.umkm_maps_url ?? undefined,
    umkm_qris_image_url: row.umkm_qris_image_url ?? undefined,
    is_verified: row.is_verified ?? 0,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    name: row.name,
    slug: row.slug,
    price: row.price,
    original_price: row.original_price ?? undefined,
    category: row.category,
    image_url: row.image_url,
    gallery_images: row.gallery_images
      ? (() => {
          try {
            const parsed = JSON.parse(row.gallery_images);
            return Array.isArray(parsed) ? parsed : [];
          } catch (_) {
            return [];
          }
        })()
      : [],
    description: row.description ?? '',
    views: row.views ?? 0,
    is_sold_out: row.is_sold_out ?? 0,
    stock_status: row.stock_status ?? 'ready',
    production_capacity: row.production_capacity ?? undefined,
    order_lead_time_days: row.order_lead_time_days ?? 0,
    min_order: row.min_order ?? 1,
    max_order: row.max_order ?? undefined,
    delivery_coverage: row.delivery_coverage ?? 'all_sumenep',
    shelf_life_notes: row.shelf_life_notes ?? undefined,
    is_featured: row.is_featured ?? 0,
    featured_until: row.featured_until ? row.featured_until.toISOString() : undefined,
    bumped_at: row.bumped_at ? row.bumped_at.toISOString() : undefined,
    shopee_url: row.shopee_url ?? undefined,
    created_at: row.created_at
      ? typeof row.created_at === 'string'
        ? row.created_at
        : row.created_at.toISOString()
      : new Date().toISOString(),
  };
}

export function productSelect() {
  return getDb()
    .select({
      ...getTableColumns(schema.products),
      umkm_slug: schema.umkm.slug,
      umkm_name: schema.umkm.name,
      umkm_logo_url: schema.umkm.logo_url,
      umkm_phone: schema.umkm.phone,
      umkm_address: schema.umkm.address,
      umkm_ranting: schema.umkm.ranting,
      umkm_nib: schema.umkm.nib,
      umkm_halal_cert: schema.umkm.halal_cert,
      umkm_pirt: schema.umkm.pirt,
      umkm_bpom: schema.umkm.bpom,
      umkm_maps_url: schema.umkm.maps_url,
      umkm_qris_image_url: schema.umkm.qris_image_url,
      is_verified: schema.umkm.is_verified,
      zone_id: schema.zones.id,
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.products)
    .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id));
}

export const lastBumpedFirst = [
  desc(sql`CASE WHEN ${schema.products.is_featured} = 1 AND (${schema.products.featured_until} IS NULL OR ${schema.products.featured_until} > NOW()) THEN 1 ELSE 0 END`),
  desc(sql`COALESCE(${schema.products.bumped_at}, ${schema.products.created_at})`),
  desc(schema.products.id),
];

export interface ProductFilterOptions {
  zoneSlug?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: string;
  sort?: string;
  verifiedOnly?: boolean;
  excludeProductId?: number;
  limit?: number;
  offset?: number;
}

function buildProductConditions(options?: ProductFilterOptions): SQL[] {
  const conditions: SQL[] = [];

  if (options?.verifiedOnly) {
    conditions.push(eq(schema.umkm.is_verified, 1));
  }

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  if (options?.category && options.category !== 'semua') {
    conditions.push(eq(schema.products.category, options.category));
  }

  if (options?.excludeProductId) {
    conditions.push(ne(schema.products.id, options.excludeProductId));
  }

  if (options?.stockStatus && options.stockStatus !== 'semua') {
    if (options.stockStatus === 'ready') {
      conditions.push(and(eq(schema.products.stock_status, 'ready'), eq(schema.products.is_sold_out, 0))!);
    } else if (options.stockStatus === 'po') {
      conditions.push(and(eq(schema.products.stock_status, 'po'), eq(schema.products.is_sold_out, 0))!);
    } else if (options.stockStatus === 'sold_out') {
      conditions.push(or(eq(schema.products.stock_status, 'sold_out'), eq(schema.products.is_sold_out, 1))!);
    }
  }

  if (options?.search && options.search.trim() !== '') {
    const pattern = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.products.name, pattern),
        ilike(schema.products.description, pattern),
        ilike(schema.umkm.name, pattern)
      )!
    );
  }

  if (options?.minPrice && options.minPrice > 0) {
    conditions.push(gte(schema.products.price, options.minPrice));
  }

  if (options?.maxPrice && options.maxPrice > 0) {
    conditions.push(lte(schema.products.price, options.maxPrice));
  }

  return conditions;
}

function buildProductCacheKey(prefix: string, options?: ProductFilterOptions): string | null {
  if (options?.search && options.search.trim() !== '') return null;
  if (options?.minPrice || options?.maxPrice) return null;
  return `${prefix}:${options?.zoneSlug || 'all'}:${options?.category || 'all'}:${options?.stockStatus || 'all'}:${options?.sort || 'newest'}:${options?.verifiedOnly ? '1' : '0'}:${options?.excludeProductId || 0}:${options?.limit ?? 'all'}:${options?.offset ?? 0}`;
}

export async function getProducts(options?: ProductFilterOptions): Promise<Product[]> {
  const load = async () => {
    const conditions = buildProductConditions(options);
    const order =
      options?.sort === 'price_asc'
        ? [asc(schema.products.price), desc(schema.products.id)]
        : options?.sort === 'price_desc'
          ? [desc(schema.products.price), desc(schema.products.id)]
          : lastBumpedFirst;

    const baseQuery = productSelect()
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...order);

    const rows =
      typeof options?.limit === 'number' && options.limit > 0
        ? await baseQuery.limit(options.limit).offset(Math.max(0, options.offset ?? 0))
        : await baseQuery;

    return resolveProductStoreLogos(rows.map(toProduct));
  };

  const cacheKey = buildProductCacheKey('products:list', options);
  if (cacheKey) {
    return getOrSetCache(cacheKey, 60_000, load);
  }
  return load();
}

export async function getProductsCount(options?: ProductFilterOptions): Promise<number> {
  const load = async () => {
    const conditions = buildProductConditions(options);
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.products)
      .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
      .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
      .where(conditions.length ? and(...conditions) : undefined);
    return Number(row?.count ?? 0);
  };

  const cacheKey = buildProductCacheKey('products:count', options);
  if (cacheKey) {
    return getOrSetCache(cacheKey, 60_000, load);
  }
  return load();
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const [row] = await productSelect().where(eq(schema.products.slug, slug));
  if (!row) return undefined;
  const [resolved] = await resolveProductStoreLogos([toProduct(row)]);
  return resolved;
}

export async function createUMKMAndProduct(data: {
  umkmName: string;
  phone: string;
  zoneId: number;
  address?: string;
  productName: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl: string;
  galleryImages?: string[] | string;
  description?: string;
  shopeeUrl?: string;
  stockStatus?: string;
  productionCapacity?: string;
  orderLeadTimeDays?: number;
  minOrder?: number;
  maxOrder?: number;
  deliveryCoverage?: string;
  shelfLifeNotes?: string;
  isSoldOut?: number;
  createdByUserId?: number;
}): Promise<{ umkmId: number; productId: number; slug: string }> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  return await getDb().transaction(async (tx) => {
    let targetUmkmId: number;
    const [existingStore] = await tx
      .select({ id: schema.umkm.id, user_id: schema.umkm.user_id })
      .from(schema.umkm)
      .where(eq(schema.umkm.phone, cleanPhone))
      .limit(1);

    if (existingStore) {
      if (existingStore.user_id && existingStore.user_id === data.createdByUserId) {
        targetUmkmId = existingStore.id;
      } else {
        throw new Error('Nomor WhatsApp toko ini sudah terdaftar. Gunakan menu Pengaturan Toko / Klaim Toko.');
      }
    } else {
      const [umkmRow] = await tx
        .insert(schema.umkm)
        .values({
          name: data.umkmName,
          slug: generateStoreSlug(data.umkmName),
          phone: cleanPhone,
          zone_id: data.zoneId,
          is_verified: 0,
          address: data.address || '',
          user_id: data.createdByUserId || null,
          created_by_user_id: data.createdByUserId || null,
        })
        .returning({ id: schema.umkm.id });
      targetUmkmId = umkmRow.id;
    }

    const [productRow] = await tx
      .insert(schema.products)
      .values({
        umkm_id: targetUmkmId,
        name: data.productName,
        slug: uniqueSlug,
        price: data.price,
        original_price: data.originalPrice || null,
        category: data.category,
        image_url: data.imageUrl,
        gallery_images: data.galleryImages && (!Array.isArray(data.galleryImages) || data.galleryImages.length > 0)
          ? (typeof data.galleryImages === 'string' ? data.galleryImages : JSON.stringify(data.galleryImages))
          : null,
        description: data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`,
        shopee_url: data.shopeeUrl || null,
        stock_status: data.stockStatus || 'ready',
        production_capacity: data.productionCapacity || null,
        order_lead_time_days: data.orderLeadTimeDays !== undefined ? data.orderLeadTimeDays : 0,
        min_order: data.minOrder !== undefined ? data.minOrder : 1,
        max_order: data.maxOrder || null,
        delivery_coverage: data.deliveryCoverage || 'all_sumenep',
        shelf_life_notes: data.shelfLifeNotes || null,
        is_sold_out: data.isSoldOut !== undefined ? data.isSoldOut : (data.stockStatus === 'sold_out' ? 1 : 0),
      })
      .returning({ id: schema.products.id });

    return {
      umkmId: targetUmkmId,
      productId: productRow.id,
      slug: uniqueSlug,
    };
  }).then((res) => {
    invalidateCatalogCaches();
    return res;
  });
}

export async function incrementProductViews(slug: string): Promise<{ success: boolean }> {
  try {
    const rows = await getDb()
      .update(schema.products)
      .set({ views: sql`COALESCE(${schema.products.views}, 0) + 1` })
      .where(eq(schema.products.slug, slug))
      .returning({ id: schema.products.id });
    return { success: rows.length > 0 };
  } catch (err) {
    console.error('Error incrementing views:', err);
    return { success: false };
  }
}

export async function bumpProduct(
  productId: number,
  umkmId?: number
): Promise<{ success: boolean; reason?: string; remainingCredits: number; message: string }> {
  const db = getDb();

  // If umkmId is provided, enforce atomic credit check and record bump ledger
  if (umkmId) {
    const result = await db.transaction(async (tx) => {
      const [updatedStore] = await tx
        .update(schema.umkm)
        .set({ bump_credits: sql`COALESCE(${schema.umkm.bump_credits}, 0) - 1` })
        .where(and(eq(schema.umkm.id, umkmId), gt(schema.umkm.bump_credits, 0)))
        .returning({ bump_credits: schema.umkm.bump_credits });

      if (!updatedStore) {
        return null;
      }

      const [bumped] = await tx
        .update(schema.products)
        .set({ bumped_at: new Date() })
        .where(and(eq(schema.products.id, productId), eq(schema.products.umkm_id, umkmId)))
        .returning({ id: schema.products.id });

      if (!bumped) {
        throw new Error('Produk tidak ditemukan atau bukan milik toko ini.');
      }

      const balanceAfter = Math.max(0, updatedStore.bump_credits ?? 0);
      await tx.insert(schema.bumpLedger).values({
        umkm_id: umkmId,
        delta: -1,
        reason: 'bump',
        reference_id: productId,
        balance_after: balanceAfter,
      });

      return balanceAfter;
    });

    if (result === null) {
      return {
        success: false,
        reason: 'insufficient_credits',
        remainingCredits: 0,
        message: 'Token sundul Anda telah habis (0 token). Silakan beli paket token sundul mulai Rp 5.000 untuk menaikkan iklan ke posisi teratas.',
      };
    }

    invalidateCatalogCaches();
    return {
      success: true,
      remainingCredits: result,
      message: `Alhamdulillah! Iklan berhasil disundul ke posisi teratas katalog. Sisa token: ${result}.`,
    };
  }

  // Fallback for admin or unconstrained bump
  await db
    .update(schema.products)
    .set({ bumped_at: new Date() })
    .where(eq(schema.products.id, productId));

  invalidateCatalogCaches();
  return {
    success: true,
    remainingCredits: 0,
    message: 'Alhamdulillah! Iklan berhasil disundul ke posisi teratas katalog.',
  };
}

export async function toggleProductStock(
  productId: number,
  umkmId?: number
): Promise<{ success: boolean; is_sold_out: number }> {
  const conditions = [eq(schema.products.id, productId)];
  if (umkmId) {
    conditions.push(eq(schema.products.umkm_id, umkmId));
  }

  const rows = await getDb()
    .update(schema.products)
    .set({ is_sold_out: sql`CASE WHEN ${schema.products.is_sold_out} = 1 THEN 0 ELSE 1 END` })
    .where(and(...conditions))
    .returning({ is_sold_out: schema.products.is_sold_out });

  if (rows.length === 0) return { success: false, is_sold_out: 0 };

  invalidateCatalogCaches();
  return { success: true, is_sold_out: rows[0].is_sold_out ?? 0 };
}

export async function deleteProduct(productId: number, umkmId?: number): Promise<boolean> {
  const conditions = [eq(schema.products.id, productId)];
  if (umkmId) {
    conditions.push(eq(schema.products.umkm_id, umkmId));
  }

  const rows = await getDb()
    .delete(schema.products)
    .where(and(...conditions))
    .returning({ id: schema.products.id });
  if (rows.length > 0) invalidateCatalogCaches();
  return rows.length > 0;
}

export async function addProductToUMKM(
  umkmId: number,
  data: {
    name: string;
    price: number;
    originalPrice?: number;
    category: string;
    imageUrl: string;
    galleryImages?: string[] | string;
    description?: string;
    shopeeUrl?: string;
    stockStatus?: string;
    productionCapacity?: string;
    orderLeadTimeDays?: number;
    minOrder?: number;
    maxOrder?: number;
    deliveryCoverage?: string;
    shelfLifeNotes?: string;
    isSoldOut?: number;
  }
): Promise<{ productId: number; slug: string }> {
  const uniqueSlug = `${slugify(data.name)}-${Date.now().toString(36)}`;
  const [store] = await getDb()
    .select({ name: schema.umkm.name })
    .from(schema.umkm)
    .where(eq(schema.umkm.id, umkmId));
  const storeName = store ? store.name : 'UMKM NU';

  const [created] = await getDb()
    .insert(schema.products)
    .values({
      umkm_id: umkmId,
      name: data.name,
      slug: uniqueSlug,
      price: data.price,
      original_price: data.originalPrice || null,
      category: data.category,
      image_url: data.imageUrl,
      gallery_images: data.galleryImages && (!Array.isArray(data.galleryImages) || data.galleryImages.length > 0)
        ? (typeof data.galleryImages === 'string' ? data.galleryImages : JSON.stringify(data.galleryImages))
        : null,
      description: data.description || `${data.name} dari ${storeName}, Sumenep.`,
      shopee_url: data.shopeeUrl || null,
      stock_status: data.stockStatus || 'ready',
      production_capacity: data.productionCapacity || null,
      order_lead_time_days: data.orderLeadTimeDays !== undefined ? data.orderLeadTimeDays : 0,
      min_order: data.minOrder !== undefined ? data.minOrder : 1,
      max_order: data.maxOrder || null,
      delivery_coverage: data.deliveryCoverage || 'all_sumenep',
      shelf_life_notes: data.shelfLifeNotes || null,
      is_sold_out: data.isSoldOut !== undefined ? data.isSoldOut : (data.stockStatus === 'sold_out' ? 1 : 0),
      bumped_at: new Date(),
    })
    .returning({ id: schema.products.id });

  invalidateCatalogCaches();
  return {
    productId: created.id,
    slug: uniqueSlug,
  };
}

export async function updateProduct(
  productId: number,
  umkmId: number,
  data: {
    name: string;
    price: number;
    originalPrice?: number;
    category: string;
    imageUrl?: string;
    galleryImages?: string[] | string;
    description?: string;
    shopeeUrl?: string;
    stockStatus?: string;
    productionCapacity?: string;
    orderLeadTimeDays?: number;
    minOrder?: number;
    maxOrder?: number;
    deliveryCoverage?: string;
    shelfLifeNotes?: string;
    isSoldOut?: number;
  }
): Promise<boolean> {
  const [existing] = await getDb()
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.umkm_id, umkmId)));

  if (!existing) return false;

  const updateFields: any = {
    name: data.name,
    price: data.price,
    category: data.category,
    description: data.description ?? '',
    shopee_url: data.shopeeUrl || null,
  };

  if (data.originalPrice !== undefined) {
    updateFields.original_price = data.originalPrice || null;
  }

  if (data.galleryImages !== undefined) {
    updateFields.gallery_images = data.galleryImages && (!Array.isArray(data.galleryImages) || data.galleryImages.length > 0)
      ? typeof data.galleryImages === 'string'
        ? data.galleryImages
        : JSON.stringify(data.galleryImages)
      : null;
  }

  if (data.stockStatus) {
    updateFields.stock_status = data.stockStatus;
    if (data.stockStatus === 'sold_out') {
      updateFields.is_sold_out = 1;
    } else if (data.isSoldOut === undefined) {
      updateFields.is_sold_out = 0;
    }
  }

  if (data.productionCapacity !== undefined) {
    updateFields.production_capacity = data.productionCapacity || null;
  }

  if (data.orderLeadTimeDays !== undefined) {
    updateFields.order_lead_time_days = data.orderLeadTimeDays;
  }

  if (data.minOrder !== undefined) {
    updateFields.min_order = data.minOrder;
  }

  if (data.maxOrder !== undefined) {
    updateFields.max_order = data.maxOrder || null;
  }

  if (data.deliveryCoverage !== undefined) {
    updateFields.delivery_coverage = data.deliveryCoverage || 'all_sumenep';
  }

  if (data.shelfLifeNotes !== undefined) {
    updateFields.shelf_life_notes = data.shelfLifeNotes || null;
  }

  if (data.isSoldOut !== undefined) {
    updateFields.is_sold_out = data.isSoldOut;
  }

  if (data.imageUrl) {
    updateFields.image_url = data.imageUrl;
  }

  await getDb()
    .update(schema.products)
    .set(updateFields)
    .where(eq(schema.products.id, productId));

  invalidateCatalogCaches();
  return true;
}

export async function getProductsByIds(productIds: number[]): Promise<Product[]> {
  if (!productIds || productIds.length === 0) return [];
  const rows = await productSelect()
    .where(inArray(schema.products.id, productIds))
    .orderBy(desc(schema.products.id));
  return rows.map(toProduct);
}

export async function getMostFavoritedProducts(limit = 4): Promise<Product[]> {
  return getOrSetCache(`products:most_favorited:${limit}`, 60_000, async () => {
    const rows = await getDb()
      .select({
        ...getTableColumns(schema.products),
        umkm_slug: schema.umkm.slug,
        umkm_name: schema.umkm.name,
        umkm_phone: schema.umkm.phone,
        umkm_address: schema.umkm.address,
        umkm_ranting: schema.umkm.ranting,
        umkm_nib: schema.umkm.nib,
        umkm_halal_cert: schema.umkm.halal_cert,
        umkm_pirt: schema.umkm.pirt,
        umkm_bpom: schema.umkm.bpom,
        is_verified: schema.umkm.is_verified,
        zone_id: schema.zones.id,
        zone_name: schema.zones.name,
        zone_slug: schema.zones.slug,
      })
      .from(schema.products)
      .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
      .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
      .leftJoin(schema.favorites, eq(schema.favorites.product_id, schema.products.id))
      .groupBy(schema.products.id, schema.umkm.id, schema.zones.id)
      .orderBy(
        desc(sql`count(${schema.favorites.id})`),
        desc(schema.products.views),
        desc(schema.products.id)
      )
      .limit(limit);

    return rows.map(toProduct);
  });
}

export async function getPopularTags(limit = 8): Promise<string[]> {
  return getOrSetCache(`products:popular_tags:${limit}`, 300_000, async () => {
    try {
      const rows = await getDb()
        .select({ name: schema.products.name })
        .from(schema.products)
        .where(sql`${schema.products.is_sold_out} = 0`)
        .orderBy(
          desc(schema.products.views),
          desc(sql`COALESCE(${schema.products.bumped_at}, ${schema.products.created_at})`),
          desc(schema.products.id)
        )
        .limit(limit * 3);

      if (!rows || rows.length === 0) {
        return ['Rengginang Lorjuk', 'Batik Tulis Madura', 'Petis Cakalang', 'Gula Siwalan', 'Terasi Rebon'];
      }

      const uniqueTags: string[] = [];
      for (const r of rows) {
        const cleanName = r.name.trim();
        if (cleanName && !uniqueTags.includes(cleanName)) {
          uniqueTags.push(cleanName);
        }
        if (uniqueTags.length >= limit) break;
      }

      return uniqueTags.length > 0
        ? uniqueTags
        : ['Rengginang Lorjuk', 'Batik Tulis Madura', 'Petis Cakalang', 'Gula Siwalan', 'Terasi Rebon'];
    } catch (err) {
      console.error('[getPopularTags] Error fetching dynamic tags:', err);
      return ['Rengginang Lorjuk', 'Batik Tulis Madura', 'Petis Cakalang', 'Gula Siwalan', 'Terasi Rebon'];
    }
  });
}

export async function isProductOwnedByUMKM(productId: number, umkmId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.umkm_id, umkmId)))
    .limit(1);
  return Boolean(row);
}
