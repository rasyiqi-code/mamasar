import { and, asc, desc, eq, getTableColumns, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp } from '../utils';
import type { ClaimCandidate, SetupUMKMResult, UMKM, UMKMVerificationRow, Product } from './types';
import { productSelect, toProduct, lastBumpedFirst } from './products';

export type UMKMJoinRow = typeof schema.umkm.$inferSelect & {
  zone_name: string;
  zone_slug: string;
};

export function toUMKM(row: UMKMJoinRow): UMKM & { zone_name: string; zone_slug: string } {
  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    phone: row.phone,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    ranting: row.ranting ?? undefined,
    is_verified: row.is_verified ?? 1,
    address: row.address ?? undefined,
    nib: row.nib ?? undefined,
    halal_cert: row.halal_cert ?? undefined,
    pirt: row.pirt ?? undefined,
    bpom: row.bpom ?? undefined,
    other_legalities: row.other_legalities ?? undefined,
    bump_credits: row.bump_credits ?? 3,
  };
}

export async function getAllUMKM(options?: {
  zoneSlug?: string;
  search?: string;
}): Promise<(UMKM & { product_count: number; zone_slug: string; sample_images: string[] })[]> {
  const conditions: SQL[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  if (options?.search && options.search.trim() !== '') {
    const pattern = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.umkm.name, pattern),
        ilike(schema.umkm.address, pattern),
        ilike(schema.zones.name, pattern)
      )!
    );
  }

  const rows = await getDb()
    .select({
      ...getTableColumns(schema.umkm),
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
      product_count: sql<number>`count(${schema.products.id})::int`,
      sample_images_str: sql<string | null>`string_agg(${schema.products.image_url}, ',')`,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .leftJoin(schema.products, eq(schema.products.umkm_id, schema.umkm.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(schema.umkm.id, schema.zones.name, schema.zones.slug)
    .orderBy(desc(sql`count(${schema.products.id})`), asc(schema.umkm.id));

  return rows.map((r) => ({
    ...toUMKM(r),
    product_count: r.product_count,
    sample_images: r.sample_images_str ? String(r.sample_images_str).split(',').filter(Boolean) : [],
  }));
}

export async function getUMKMById(id: number | string): Promise<(UMKM & {
  zone_name: string;
  zone_slug: string;
  product_count: number;
  products: Product[];
}) | undefined> {
  const numId = Number(id);
  if (isNaN(numId)) return undefined;

  const [store] = await getDb()
    .select({
      ...getTableColumns(schema.umkm),
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
      product_count: sql<number>`count(${schema.products.id})::int`,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .leftJoin(schema.products, eq(schema.products.umkm_id, schema.umkm.id))
    .where(eq(schema.umkm.id, numId))
    .groupBy(schema.umkm.id, schema.zones.name, schema.zones.slug);

  if (!store) return undefined;

  const productRows = await productSelect()
    .where(eq(schema.products.umkm_id, numId))
    .orderBy(desc(schema.products.id));

  return {
    ...toUMKM(store),
    product_count: store.product_count,
    products: productRows.map(toProduct),
  };
}

export async function getUMKMByUserId(
  userId: number
): Promise<(UMKM & { zone_name: string; zone_slug: string; products: Product[] }) | undefined> {
  const [store] = await getDb()
    .select({
      ...getTableColumns(schema.umkm),
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .where(eq(schema.umkm.user_id, userId));

  if (!store) return undefined;

  const productRows = await productSelect()
    .where(eq(schema.products.umkm_id, store.id))
    .orderBy(...lastBumpedFirst);

  return {
    ...toUMKM(store),
    products: productRows.map(toProduct),
  };
}

async function findClaimableUMKMByPhone(cleanPhone: string): Promise<ClaimCandidate | undefined> {
  const [row] = await getDb()
    .select({ id: schema.umkm.id, name: schema.umkm.name, zone_name: schema.zones.name })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .where(and(eq(schema.umkm.phone, cleanPhone), isNull(schema.umkm.user_id)))
    .orderBy(asc(schema.umkm.id))
    .limit(1);
  return row;
}

export async function setupUMKMForUser(
  userId: number,
  data: {
    name: string;
    phone: string;
    zoneId: number;
    address?: string;
    ranting?: string;
  },
  options?: { claimStoreId?: number; skipClaim?: boolean }
): Promise<SetupUMKMResult> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  const [existing] = await getDb()
    .select({ id: schema.umkm.id })
    .from(schema.umkm)
    .where(eq(schema.umkm.user_id, userId));

  if (existing) {
    await getDb()
      .update(schema.umkm)
      .set({
        name: data.name,
        phone: cleanPhone,
        zone_id: data.zoneId,
        address: data.address || '',
        ranting: data.ranting || null,
      })
      .where(eq(schema.umkm.id, existing.id));
    return { outcome: 'linked', storeId: existing.id, claimed: false };
  }

  if (options?.claimStoreId) {
    return await getDb().transaction(async (tx) => {
      const [claimed] = await tx
        .update(schema.umkm)
        .set({ user_id: userId })
        .where(
          and(
            eq(schema.umkm.id, options.claimStoreId!),
            isNull(schema.umkm.user_id),
            eq(schema.umkm.phone, cleanPhone)
          )
        )
        .returning({ id: schema.umkm.id });

      if (!claimed) return { outcome: 'claim_failed' as const };

      await tx
        .update(schema.umkm)
        .set({
          name: data.name,
          zone_id: data.zoneId,
          address: data.address || '',
          ranting: data.ranting || null,
        })
        .where(eq(schema.umkm.id, claimed.id));

      return { outcome: 'linked' as const, storeId: claimed.id, claimed: true };
    });
  }

  if (!options?.skipClaim) {
    const candidate = await findClaimableUMKMByPhone(cleanPhone);
    if (candidate) return { outcome: 'claim_available', candidate };
  }

  const [created] = await getDb()
    .insert(schema.umkm)
    .values({
      user_id: userId,
      name: data.name,
      phone: cleanPhone,
      zone_id: data.zoneId,
      ranting: data.ranting || null,
      is_verified: 0,
      address: data.address || '',
    })
    .returning({ id: schema.umkm.id });

  return { outcome: 'linked', storeId: created.id, claimed: false };
}

export async function getUMKMForVerification(): Promise<UMKMVerificationRow[]> {
  const rows = await getDb()
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      phone: schema.umkm.phone,
      address: schema.umkm.address,
      ranting: schema.umkm.ranting,
      is_verified: schema.umkm.is_verified,
      zone_id: schema.umkm.zone_id,
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
      owner_email: schema.users.email,
      product_count: sql<number>`(SELECT count(*)::int FROM ${schema.products} WHERE ${schema.products.umkm_id} = ${schema.umkm.id})`,
      created_at: schema.umkm.created_at,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .leftJoin(schema.users, eq(schema.umkm.user_id, schema.users.id))
    .orderBy(asc(schema.umkm.is_verified), asc(schema.umkm.created_at));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address ?? undefined,
    ranting: row.ranting ?? undefined,
    is_verified: row.is_verified ?? 1,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    owner_email: row.owner_email ?? undefined,
    product_count: row.product_count ?? 0,
    created_at: row.created_at!.toISOString(),
  }));
}

export async function setUMKMVerified(umkmId: number, verified: boolean): Promise<boolean> {
  const rows = await getDb()
    .update(schema.umkm)
    .set({ is_verified: verified ? 1 : 0 })
    .where(eq(schema.umkm.id, umkmId))
    .returning({ id: schema.umkm.id });
  return rows.length > 0;
}

export async function deleteUMKM(umkmId: number): Promise<boolean> {
  const rows = await getDb()
    .delete(schema.umkm)
    .where(eq(schema.umkm.id, umkmId))
    .returning({ id: schema.umkm.id });
  return rows.length > 0;
}

export async function updateUMKMProfile(
  umkmId: number,
  userId: number,
  data: {
    name: string;
    phone: string;
    zoneId: number;
    address?: string;
    ranting?: string;
    nib?: string;
    halalCert?: string;
    pirt?: string;
    bpom?: string;
    otherLegalities?: string;
  }
): Promise<boolean> {
  const [existing] = await getDb()
    .select({ id: schema.umkm.id })
    .from(schema.umkm)
    .where(and(eq(schema.umkm.id, umkmId), eq(schema.umkm.user_id, userId)));

  if (!existing) return false;

  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  const updateFields: any = {
    name: data.name,
    phone: cleanPhone,
    zone_id: data.zoneId,
    address: data.address || '',
  };

  if (data.ranting !== undefined) updateFields.ranting = data.ranting || null;
  if (data.nib !== undefined) updateFields.nib = data.nib || null;
  if (data.halalCert !== undefined) updateFields.halal_cert = data.halalCert || null;
  if (data.pirt !== undefined) updateFields.pirt = data.pirt || null;
  if (data.bpom !== undefined) updateFields.bpom = data.bpom || null;
  if (data.otherLegalities !== undefined) updateFields.other_legalities = data.otherLegalities || null;

  await getDb()
    .update(schema.umkm)
    .set(updateFields)
    .where(eq(schema.umkm.id, umkmId));

  return true;
}

export async function createStoreByPetugas(
  createdByUserId: number,
  data: {
    name: string;
    phone: string;
    zoneId: number;
    address?: string;
    ranting?: string;
    nib?: string;
    halalCert?: string;
    pirt?: string;
    bpom?: string;
    otherLegalities?: string;
  }
): Promise<{
  storeId: number;
  isExisting: boolean;
  storeName: string;
  zoneId: number;
  zoneName: string;
  phone: string;
  address?: string;
  ranting?: string;
}> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const db = getDb();

  // Check if store with phone already exists
  const [existingStore] = await db
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      phone: schema.umkm.phone,
      zone_id: schema.umkm.zone_id,
      address: schema.umkm.address,
      ranting: schema.umkm.ranting,
      zone_name: schema.zones.name,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .where(eq(schema.umkm.phone, cleanPhone))
    .limit(1);

  if (existingStore) {
    return {
      storeId: existingStore.id,
      isExisting: true,
      storeName: existingStore.name,
      zoneId: existingStore.zone_id,
      zoneName: existingStore.zone_name,
      phone: existingStore.phone,
      address: existingStore.address || undefined,
      ranting: existingStore.ranting || undefined,
    };
  }

  const [zone] = await db
    .select({ name: schema.zones.name })
    .from(schema.zones)
    .where(eq(schema.zones.id, data.zoneId))
    .limit(1);

  const [created] = await db
    .insert(schema.umkm)
    .values({
      name: data.name,
      phone: cleanPhone,
      zone_id: data.zoneId,
      ranting: data.ranting || null,
      is_verified: 1, // Verified direct entry by officer
      address: data.address || '',
      created_by_user_id: createdByUserId,
      nib: data.nib || null,
      halal_cert: data.halalCert || null,
      pirt: data.pirt || null,
      bpom: data.bpom || null,
      other_legalities: data.otherLegalities || null,
    })
    .returning({ id: schema.umkm.id, name: schema.umkm.name, phone: schema.umkm.phone });

  return {
    storeId: created.id,
    isExisting: false,
    storeName: created.name,
    zoneId: data.zoneId,
    zoneName: zone ? zone.name : '',
    phone: created.phone,
    address: data.address,
    ranting: data.ranting,
  };
}
