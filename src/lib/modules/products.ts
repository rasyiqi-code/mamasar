import { and, asc, desc, eq, getTableColumns, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp, slugify } from '../utils';
import type { Product } from './types';

export type ProductRow = typeof schema.products.$inferSelect & {
  umkm_name: string;
  umkm_phone: string;
  umkm_address: string | null;
  umkm_ranting?: string | null;
  umkm_nib?: string | null;
  umkm_halal_cert?: string | null;
  umkm_pirt?: string | null;
  umkm_bpom?: string | null;
  is_verified: number | null;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
};

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    umkm_id: row.umkm_id,
    umkm_name: row.umkm_name,
    umkm_phone: row.umkm_phone,
    umkm_address: row.umkm_address ?? '',
    umkm_ranting: row.umkm_ranting ?? undefined,
    umkm_nib: row.umkm_nib ?? undefined,
    umkm_halal_cert: row.umkm_halal_cert ?? undefined,
    umkm_pirt: row.umkm_pirt ?? undefined,
    umkm_bpom: row.umkm_bpom ?? undefined,
    is_verified: row.is_verified ?? 1,
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
    is_featured: row.is_featured ?? 0,
    featured_until: row.featured_until ? row.featured_until.toISOString() : undefined,
    bumped_at: row.bumped_at ? row.bumped_at.toISOString() : undefined,
    shopee_url: row.shopee_url ?? undefined,
    created_at: row.created_at!.toISOString(),
  };
}

export function productSelect() {
  return getDb()
    .select({
      ...getTableColumns(schema.products),
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
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id));
}

export const lastBumpedFirst = [
  desc(sql`CASE WHEN ${schema.products.is_featured} = 1 AND (${schema.products.featured_until} IS NULL OR ${schema.products.featured_until} > NOW()) THEN 1 ELSE 0 END`),
  desc(sql`COALESCE(${schema.products.bumped_at}, ${schema.products.created_at})`),
  desc(schema.products.id),
];

export async function getProducts(options?: {
  zoneSlug?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: string;
  sort?: string;
}): Promise<Product[]> {
  const conditions: SQL[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  if (options?.category && options.category !== 'semua') {
    conditions.push(eq(schema.products.category, options.category));
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

  const order =
    options?.sort === 'price_asc'
      ? [asc(schema.products.price), desc(schema.products.id)]
      : options?.sort === 'price_desc'
        ? [desc(schema.products.price), desc(schema.products.id)]
        : lastBumpedFirst;

  const rows = await productSelect()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...order);
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const [row] = await productSelect().where(eq(schema.products.slug, slug));
  return row ? toProduct(row) : undefined;
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
  isSoldOut?: number;
  createdByUserId?: number;
}): Promise<{ umkmId: number; productId: number; slug: string }> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  return await getDb().transaction(async (tx) => {
    let targetUmkmId: number;
    const [existingStore] = await tx
      .select({ id: schema.umkm.id })
      .from(schema.umkm)
      .where(eq(schema.umkm.phone, cleanPhone))
      .limit(1);

    if (existingStore) {
      targetUmkmId = existingStore.id;
    } else {
      const [umkmRow] = await tx
        .insert(schema.umkm)
        .values({
          name: data.umkmName,
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
        gallery_images: data.galleryImages ? (typeof data.galleryImages === 'string' ? data.galleryImages : JSON.stringify(data.galleryImages)) : null,
        description: data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`,
        shopee_url: data.shopeeUrl || null,
        stock_status: data.stockStatus || 'ready',
        production_capacity: data.productionCapacity || null,
        is_sold_out: data.isSoldOut !== undefined ? data.isSoldOut : (data.stockStatus === 'sold_out' ? 1 : 0),
      })
      .returning({ id: schema.products.id });

    return {
      umkmId: targetUmkmId,
      productId: productRow.id,
      slug: uniqueSlug,
    };
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

  // If umkmId is provided, enforce credit check
  if (umkmId) {
    const [store] = await db
      .select({ bump_credits: schema.umkm.bump_credits })
      .from(schema.umkm)
      .where(eq(schema.umkm.id, umkmId));

    const currentCredits = store ? (store.bump_credits ?? 0) : 0;
    if (currentCredits <= 0) {
      return {
        success: false,
        reason: 'insufficient_credits',
        remainingCredits: 0,
        message: 'Token sundul Anda telah habis (0 token). Silakan beli paket token sundul mulai Rp 5.000 untuk menaikkan iklan ke posisi teratas.',
      };
    }

    // Decrement 1 credit and update bumped_at
    await db.transaction(async (tx) => {
      await tx
        .update(schema.umkm)
        .set({ bump_credits: sql`GREATEST(0, COALESCE(${schema.umkm.bump_credits}, 0) - 1)` })
        .where(eq(schema.umkm.id, umkmId));

      await tx
        .update(schema.products)
        .set({ bumped_at: new Date() })
        .where(and(eq(schema.products.id, productId), eq(schema.products.umkm_id, umkmId)));
    });

    return {
      success: true,
      remainingCredits: Math.max(0, currentCredits - 1),
      message: `Alhamdulillah! Iklan berhasil disundul ke posisi teratas katalog. Sisa token: ${Math.max(0, currentCredits - 1)}.`,
    };
  }

  // Fallback for admin or unconstrained bump
  await db
    .update(schema.products)
    .set({ bumped_at: new Date() })
    .where(eq(schema.products.id, productId));

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
      gallery_images: data.galleryImages ? (typeof data.galleryImages === 'string' ? data.galleryImages : JSON.stringify(data.galleryImages)) : null,
      description: data.description || `${data.name} dari ${storeName}, Sumenep.`,
      shopee_url: data.shopeeUrl || null,
      stock_status: data.stockStatus || 'ready',
      production_capacity: data.productionCapacity || null,
      is_sold_out: data.isSoldOut !== undefined ? data.isSoldOut : (data.stockStatus === 'sold_out' ? 1 : 0),
      bumped_at: new Date(),
    })
    .returning({ id: schema.products.id });

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
    updateFields.gallery_images = data.galleryImages
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

  return true;
}

export async function getProductsByIds(productIds: number[]): Promise<Product[]> {
  if (!productIds || productIds.length === 0) return [];
  const rows = await productSelect()
    .where(inArray(schema.products.id, productIds))
    .orderBy(desc(schema.products.id));
  return rows.map(toProduct);
}
