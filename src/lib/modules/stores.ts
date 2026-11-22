import { and, asc, desc, eq, getTableColumns, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { formatPhoneForWhatsApp, slugify } from '../utils';
import { getOrSetCache, invalidateCache } from '../cache';
import type { ClaimCandidate, SetupUMKMResult, UMKM, UMKMVerificationRow, Product } from './types';
import { productSelect, toProduct, lastBumpedFirst, resolveProductStoreLogos } from './products';
import { resolveAvatarUrl } from '../neon';
import { recordAuditLog } from './audit';
import { createNotification } from './notifications';

function invalidateCatalogCaches() {
  invalidateCache('stores:');
  invalidateCache('products:');
  invalidateCache('zones:');
}

export function generateStoreSlug(name: string): string {
  const base = slugify(name) || 'toko-umkm';
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export type UMKMJoinRow = typeof schema.umkm.$inferSelect & {
  zone_name: string;
  zone_slug: string;
};

export function toUMKM(row: UMKMJoinRow): UMKM & { zone_name: string; zone_slug: string } {
  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    slug: row.slug ?? undefined,
    logo_url: row.logo_url ?? undefined,
    phone: row.phone,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    ranting: row.ranting ?? undefined,
    is_verified: row.is_verified ?? 0,
    address: row.address ?? undefined,
    nib: row.nib ?? undefined,
    halal_cert: row.halal_cert ?? undefined,
    pirt: row.pirt ?? undefined,
    bpom: row.bpom ?? undefined,
    other_legalities: row.other_legalities ?? undefined,
    maps_url: row.maps_url ?? undefined,
    qris_image_url: row.qris_image_url ?? undefined,
    order_modes: row.order_modes ?? 'ready_stock',
    daily_capacity: row.daily_capacity ?? undefined,
    order_lead_time_days: row.order_lead_time_days ?? 1,
    delivery_coverage: row.delivery_coverage ?? 'local_village',
    max_bulk_order: row.max_bulk_order ?? undefined,
    shelf_life_notes: row.shelf_life_notes ?? undefined,
    verification_status: row.verification_status ?? (row.is_verified ? 'verified' : 'unverified'),
    verification_submitted_at: row.verification_submitted_at ? row.verification_submitted_at.toISOString() : undefined,
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

  const loadStores = async () => {
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

    return Promise.all(
      rows.map(async (r) => ({
        ...toUMKM(r),
        logo_url: (await resolveAvatarUrl(r.logo_url)) ?? undefined,
        product_count: r.product_count,
        sample_images: r.sample_images_str ? String(r.sample_images_str).split(',').filter(Boolean) : [],
      }))
    );
  };

  if (!options?.search) {
    return getOrSetCache(`stores:${options?.zoneSlug || 'semua'}`, 60_000, loadStores);
  }
  return loadStores();
}

export async function getStoresCount(): Promise<number> {
  return getOrSetCache('stores:count', 60_000, async () => {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.umkm);
    return Number(row?.count ?? 0);
  });
}

export async function getFeaturedStores(
  limit = 4
): Promise<(UMKM & { product_count: number; zone_slug: string; sample_images: string[] })[]> {
  return getOrSetCache(`stores:featured:${limit}`, 60_000, async () => {
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
      .groupBy(schema.umkm.id, schema.zones.name, schema.zones.slug)
      .orderBy(desc(schema.umkm.is_verified), desc(sql`count(${schema.products.id})`), asc(schema.umkm.id))
      .limit(limit);

    return Promise.all(
      rows.map(async (r) => ({
        ...toUMKM(r),
        logo_url: (await resolveAvatarUrl(r.logo_url)) ?? undefined,
        product_count: r.product_count,
        sample_images: r.sample_images_str ? String(r.sample_images_str).split(',').filter(Boolean) : [],
      }))
    );
  });
}

export async function getUMKMById(idOrSlug: number | string): Promise<(UMKM & {
  zone_name: string;
  zone_slug: string;
  product_count: number;
  products: Product[];
}) | undefined> {
  const raw = String(idOrSlug).trim();
  if (!raw) return undefined;
  const isNumeric = /^\d+$/.test(raw);
  const whereClause = isNumeric ? eq(schema.umkm.id, Number(raw)) : eq(schema.umkm.slug, raw);

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
    .where(whereClause)
    .groupBy(schema.umkm.id, schema.zones.name, schema.zones.slug);

  if (!store) return undefined;

  const productRows = await productSelect()
    .where(eq(schema.products.umkm_id, store.id))
    .orderBy(desc(schema.products.id));

  const resolvedLogo = (await resolveAvatarUrl(store.logo_url)) ?? undefined;
  const resolvedProducts = await resolveProductStoreLogos(productRows.map(toProduct));

  return {
    ...toUMKM(store),
    logo_url: resolvedLogo,
    product_count: store.product_count,
    products: resolvedProducts,
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
    .where(eq(schema.umkm.user_id, userId))
    .orderBy(asc(schema.umkm.id))
    .limit(1);

  if (!store) return undefined;

  const productRows = await productSelect()
    .where(eq(schema.products.umkm_id, store.id))
    .orderBy(...lastBumpedFirst);

  const resolvedLogo = (await resolveAvatarUrl(store.logo_url)) ?? undefined;
  const resolvedProducts = await resolveProductStoreLogos(productRows.map(toProduct));

  return {
    ...toUMKM(store),
    logo_url: resolvedLogo,
    products: resolvedProducts,
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
    orderModes?: string;
    maxBulkOrder?: number;
    nib?: string;
    halalCert?: string;
    pirt?: string;
    bpom?: string;
    otherLegalities?: string;
  },
  options?: { claimStoreId?: number; skipClaim?: boolean }
): Promise<SetupUMKMResult> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  const [existing] = await getDb()
    .select({ id: schema.umkm.id })
    .from(schema.umkm)
    .where(eq(schema.umkm.user_id, userId));

  if (existing) {
    const updateFields: Record<string, any> = {
      name: data.name,
      phone: cleanPhone,
      zone_id: data.zoneId,
      address: data.address || '',
      ranting: data.ranting || null,
    };
    if (data.orderModes !== undefined) updateFields.order_modes = data.orderModes || '';
    if (data.maxBulkOrder !== undefined) updateFields.max_bulk_order = data.maxBulkOrder;
    if (data.nib !== undefined) updateFields.nib = data.nib || null;
    if (data.halalCert !== undefined) updateFields.halal_cert = data.halalCert || null;
    if (data.pirt !== undefined) updateFields.pirt = data.pirt || null;
    if (data.bpom !== undefined) updateFields.bpom = data.bpom || null;
    if (data.otherLegalities !== undefined) updateFields.other_legalities = data.otherLegalities || null;

    await getDb()
      .update(schema.umkm)
      .set(updateFields)
      .where(eq(schema.umkm.id, existing.id));

    invalidateCatalogCaches();
    return { outcome: 'linked', storeId: existing.id, claimed: false };
  }

  if (options?.claimStoreId) {
    return await getDb().transaction(async (tx) => {
      const [claimed] = await tx
        .update(schema.umkm)
        .set({ user_id: userId, claimed_at: new Date() })
        .where(
          and(
            eq(schema.umkm.id, options.claimStoreId!),
            isNull(schema.umkm.user_id),
            eq(schema.umkm.phone, cleanPhone)
          )
        )
        .returning({ id: schema.umkm.id });

      if (!claimed) return { outcome: 'claim_failed' as const };

      const updateFields: Record<string, any> = {
        name: data.name,
        zone_id: data.zoneId,
        address: data.address || '',
        ranting: data.ranting || null,
      };
      if (data.orderModes !== undefined) updateFields.order_modes = data.orderModes || '';
      if (data.maxBulkOrder !== undefined) updateFields.max_bulk_order = data.maxBulkOrder;
      if (data.nib !== undefined) updateFields.nib = data.nib || null;
      if (data.halalCert !== undefined) updateFields.halal_cert = data.halalCert || null;
      if (data.pirt !== undefined) updateFields.pirt = data.pirt || null;
      if (data.bpom !== undefined) updateFields.bpom = data.bpom || null;
      if (data.otherLegalities !== undefined) updateFields.other_legalities = data.otherLegalities || null;

      await tx
        .update(schema.umkm)
        .set(updateFields)
        .where(eq(schema.umkm.id, claimed.id));

      invalidateCatalogCaches();
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
      slug: generateStoreSlug(data.name),
      phone: cleanPhone,
      zone_id: data.zoneId,
      ranting: data.ranting || null,
      is_verified: 0,
      address: data.address || '',
      order_modes: data.orderModes || '',
      max_bulk_order: data.maxBulkOrder ?? null,
      nib: data.nib || null,
      halal_cert: data.halalCert || null,
      pirt: data.pirt || null,
      bpom: data.bpom || null,
      other_legalities: data.otherLegalities || null,
    })
    .returning({ id: schema.umkm.id });

  invalidateCatalogCaches();
  return { outcome: 'linked', storeId: created.id, claimed: false };
}

export async function getUMKMForVerification(zoneId?: number): Promise<UMKMVerificationRow[]> {
  const query = getDb()
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      slug: schema.umkm.slug,
      logo_url: schema.umkm.logo_url,
      phone: schema.umkm.phone,
      address: schema.umkm.address,
      ranting: schema.umkm.ranting,
      is_verified: schema.umkm.is_verified,
      verified_at: schema.umkm.verified_at,
      verification_note: schema.umkm.verification_note,
      verification_status: schema.umkm.verification_status,
      verification_submitted_at: schema.umkm.verification_submitted_at,
      nib: schema.umkm.nib,
      halal_cert: schema.umkm.halal_cert,
      pirt: schema.umkm.pirt,
      bpom: schema.umkm.bpom,
      other_legalities: schema.umkm.other_legalities,
      maps_url: schema.umkm.maps_url,
      order_modes: schema.umkm.order_modes,
      daily_capacity: schema.umkm.daily_capacity,
      order_lead_time_days: schema.umkm.order_lead_time_days,
      delivery_coverage: schema.umkm.delivery_coverage,
      max_bulk_order: schema.umkm.max_bulk_order,
      shelf_life_notes: schema.umkm.shelf_life_notes,
      zone_id: schema.umkm.zone_id,
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
      user_id: schema.umkm.user_id,
      owner_name: schema.users.name,
      owner_email: schema.users.email,
      product_count: sql<number>`(SELECT count(*)::int FROM ${schema.products} WHERE ${schema.products.umkm_id} = ${schema.umkm.id})`,
      created_at: schema.umkm.created_at,
    })
    .from(schema.umkm)
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .leftJoin(schema.users, eq(schema.umkm.user_id, schema.users.id));

  const rows = await (zoneId ? query.where(eq(schema.umkm.zone_id, zoneId)) : query)
    .orderBy(asc(schema.umkm.is_verified), desc(schema.umkm.verification_submitted_at), asc(schema.umkm.created_at));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined,
    logo_url: row.logo_url ?? undefined,
    phone: row.phone,
    address: row.address ?? undefined,
    ranting: row.ranting ?? undefined,
    is_verified: row.is_verified ?? 0,
    verified_at: row.verified_at ? row.verified_at.toISOString() : undefined,
    verification_note: row.verification_note ?? undefined,
    verification_status: row.verification_status ?? (row.is_verified ? 'verified' : 'unverified'),
    verification_submitted_at: row.verification_submitted_at ? row.verification_submitted_at.toISOString() : undefined,
    nib: row.nib ?? undefined,
    halal_cert: row.halal_cert ?? undefined,
    pirt: row.pirt ?? undefined,
    bpom: row.bpom ?? undefined,
    other_legalities: row.other_legalities ?? undefined,
    maps_url: row.maps_url ?? undefined,
    order_modes: row.order_modes ?? 'ready_stock',
    daily_capacity: row.daily_capacity ?? undefined,
    order_lead_time_days: row.order_lead_time_days ?? 1,
    delivery_coverage: row.delivery_coverage ?? 'local_village',
    max_bulk_order: row.max_bulk_order ?? undefined,
    shelf_life_notes: row.shelf_life_notes ?? undefined,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    user_id: row.user_id ?? null,
    owner_name: row.owner_name ?? undefined,
    owner_email: row.owner_email ?? undefined,
    product_count: row.product_count ?? 0,
    created_at: row.created_at!.toISOString(),
  }));
}

export async function getUMKMScope(umkmId: number): Promise<{
  id: number;
  name: string;
  zone_id: number;
  user_id: number | null;
} | undefined> {
  const [row] = await getDb()
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      zone_id: schema.umkm.zone_id,
      user_id: schema.umkm.user_id,
    })
    .from(schema.umkm)
    .where(eq(schema.umkm.id, umkmId))
    .limit(1);
  return row;
}

export async function setUMKMVerified(
  umkmId: number,
  verified: boolean | number,
  options?: { actorUserId?: number; note?: string; tier?: number }
): Promise<boolean> {
  return await getDb().transaction(async (tx) => {
    const now = new Date();
    const isVerif = Boolean(verified);
    const tier = options?.tier ?? (typeof verified === 'number' && verified > 0 ? verified : 1);
    const verificationStatus = isVerif
      ? (tier === 2 ? 'verified_mitra' : 'verified_mwc')
      : (options?.note ? 'rejected' : 'unverified');

    const rows = await tx
      .update(schema.umkm)
      .set({
        is_verified: isVerif ? tier : 0,
        verification_status: verificationStatus,
        verified_by_user_id: options?.actorUserId ?? null,
        verified_at: isVerif ? now : null,
        verification_note: options?.note ?? null,
      })
      .where(eq(schema.umkm.id, umkmId))
      .returning({
        id: schema.umkm.id,
        name: schema.umkm.name,
        user_id: schema.umkm.user_id,
        zone_id: schema.umkm.zone_id,
      });

    if (rows.length === 0) return false;
    const store = rows[0];

    try {
      await recordAuditLog(
        {
          actorUserId: options?.actorUserId,
          action: isVerif ? (tier === 2 ? 'umkm.verify_mitra' : 'umkm.verify_mwc') : 'umkm.unverify',
          targetType: 'umkm',
          targetId: store.id,
          metadata: { zone_id: store.zone_id, tier, note: options?.note },
        },
        tx
      );
    } catch (auditErr) {
      console.error('Audit log failed during verify (non-fatal):', auditErr);
    }

    if (store.user_id) {
      try {
        const title = isVerif
          ? (tier === 2 ? 'Selamat! Toko Terverifikasi Mitra Resmi Konsumsi NU' : 'Toko Anda Telah Diverifikasi MWC NU')
          : (options?.note ? 'Pemberitahuan Perbaikan Verifikasi Toko' : 'Status Verifikasi Toko Diperbarui');

        const body = isVerif
          ? (tier === 2
              ? `Toko "${store.name}" telah lolos verifikasi Tier 2 (Mitra Resmi Konsumsi & Berizin). Toko Anda kini menjadi prioritas pengadaan konsumsi acara NU!`
              : `Toko "${store.name}" telah diverifikasi MWC NU. Lencana resmi kini aktif di etalase katalog.`)
          : `Pengurus memberikan catatan verifikasi untuk toko "${store.name}"${options?.note ? `: "${options.note}". Silakan perbaiki data di profil toko Anda.` : '.'}`;

        await createNotification(
          {
            userId: store.user_id,
            title,
            body,
            link: '/dashboard/profil',
          },
          tx
        );
      } catch (notifErr) {
        console.error('Notification failed during verify (non-fatal):', notifErr);
      }
    }

    return true;
  }).then((ok) => {
    if (ok) invalidateCatalogCaches();
    return ok;
  });
}

export async function submitStoreVerification(
  umkmId: number,
  userId: number
): Promise<{ success: boolean; message: string }> {
  const [store] = await getDb()
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      phone: schema.umkm.phone,
      address: schema.umkm.address,
      daily_capacity: schema.umkm.daily_capacity,
      verification_status: schema.umkm.verification_status,
      is_verified: schema.umkm.is_verified,
    })
    .from(schema.umkm)
    .where(and(eq(schema.umkm.id, umkmId), eq(schema.umkm.user_id, userId)))
    .limit(1);

  if (!store) {
    return { success: false, message: 'Toko tidak ditemukan atau bukan milik akun Anda.' };
  }

  const [{ count }] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.umkm_id, umkmId));

  if (count < 2) {
    return {
      success: false,
      message: 'Syarat verifikasi belum terpenuhi: Toko wajib memiliki minimal 2 produk aktif di etalase.',
    };
  }

  if (!store.address || store.address.trim().length < 5) {
    return {
      success: false,
      message: 'Syarat verifikasi belum terpenuhi: Lengkapi alamat jelas lokasi toko atau tempat produksi.',
    };
  }

  const now = new Date();
  await getDb()
    .update(schema.umkm)
    .set({
      verification_status: 'submitted',
      verification_submitted_at: now,
      verification_note: null,
    })
    .where(eq(schema.umkm.id, umkmId));

  invalidateCatalogCaches();
  return {
    success: true,
    message: 'Pengajuan verifikasi berhasil dikirim! Pengurus MWC NU akan meninjau kelayakan toko Anda.',
  };
}

export async function deleteUMKM(umkmId: number, options?: { actorUserId?: number }): Promise<boolean> {
  return await getDb().transaction(async (tx) => {
    const rows = await tx
      .delete(schema.umkm)
      .where(eq(schema.umkm.id, umkmId))
      .returning({ id: schema.umkm.id, name: schema.umkm.name, zone_id: schema.umkm.zone_id });

    if (rows.length === 0) return false;

    try {
      await recordAuditLog(
        {
          actorUserId: options?.actorUserId,
          action: 'umkm.delete',
          targetType: 'umkm',
          targetId: rows[0].id,
          metadata: { name: rows[0].name, zone_id: rows[0].zone_id },
        },
        tx
      );
    } catch (auditErr) {
      console.error('Audit log failed during delete (non-fatal):', auditErr);
    }

    return true;
  }).then((ok) => {
    if (ok) invalidateCatalogCaches();
    return ok;
  });
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
    orderModes?: string;
    dailyCapacity?: string;
    orderLeadTimeDays?: number;
    deliveryCoverage?: string;
    maxBulkOrder?: number;
    shelfLifeNotes?: string;
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
  if (data.orderModes !== undefined) updateFields.order_modes = data.orderModes || 'ready_stock';
  if (data.dailyCapacity !== undefined) updateFields.daily_capacity = data.dailyCapacity || null;
  if (data.orderLeadTimeDays !== undefined) updateFields.order_lead_time_days = data.orderLeadTimeDays;
  if (data.deliveryCoverage !== undefined) updateFields.delivery_coverage = data.deliveryCoverage || 'local_village';
  if (data.maxBulkOrder !== undefined) updateFields.max_bulk_order = data.maxBulkOrder;
  if (data.shelfLifeNotes !== undefined) updateFields.shelf_life_notes = data.shelfLifeNotes || null;

  await getDb()
    .update(schema.umkm)
    .set(updateFields)
    .where(eq(schema.umkm.id, umkmId));

  invalidateCatalogCaches();
  return true;
}

export async function updateUMKMLogo(
  umkmId: number,
  userId: number,
  logoUrl: string | null
): Promise<boolean> {
  const [existing] = await getDb()
    .select({ id: schema.umkm.id })
    .from(schema.umkm)
    .where(and(eq(schema.umkm.id, umkmId), eq(schema.umkm.user_id, userId)));

  if (!existing) return false;

  await getDb()
    .update(schema.umkm)
    .set({ logo_url: logoUrl })
    .where(eq(schema.umkm.id, umkmId));

  invalidateCatalogCaches();
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
  },
  options?: { verified?: boolean }
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
      slug: schema.umkm.slug,
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

  const isVerified = options?.verified === true;
  const now = new Date();

  const [created] = await db
    .insert(schema.umkm)
    .values({
      name: data.name,
      slug: generateStoreSlug(data.name),
      phone: cleanPhone,
      zone_id: data.zoneId,
      ranting: data.ranting || null,
      is_verified: isVerified ? 1 : 0,
      verified_by_user_id: isVerified ? createdByUserId : null,
      verified_at: isVerified ? now : null,
      address: data.address || '',
      created_by_user_id: createdByUserId,
      nib: data.nib || null,
      halal_cert: data.halalCert || null,
      pirt: data.pirt || null,
      bpom: data.bpom || null,
      other_legalities: data.otherLegalities || null,
    })
    .returning({ id: schema.umkm.id, name: schema.umkm.name, phone: schema.umkm.phone });

  invalidateCatalogCaches();

  await recordAuditLog({
    actorUserId: createdByUserId,
    action: 'umkm.create_by_officer',
    targetType: 'umkm',
    targetId: created.id,
    metadata: { zone_id: data.zoneId, is_verified: isVerified ? 1 : 0 },
  });

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

export async function transferUMKMOwnership(
  umkmId: number,
  targetUserId: number | null,
  options: { actorUserId: number }
): Promise<{ success: boolean; message: string }> {
  const db = getDb();

  const [store] = await db
    .select({
      id: schema.umkm.id,
      name: schema.umkm.name,
      user_id: schema.umkm.user_id,
      zone_id: schema.umkm.zone_id,
    })
    .from(schema.umkm)
    .where(eq(schema.umkm.id, umkmId))
    .limit(1);

  if (!store) {
    return { success: false, message: 'Toko tidak ditemukan.' };
  }

  // Jika melepas kaitan akun (unlinking)
  if (targetUserId === null) {
    await db
      .update(schema.umkm)
      .set({
        user_id: null,
        claimed_at: null,
      })
      .where(eq(schema.umkm.id, umkmId));

    invalidateCatalogCaches();

    await recordAuditLog({
      actorUserId: options.actorUserId,
      action: 'umkm.unlink_ownership',
      targetType: 'umkm',
      targetId: umkmId,
      metadata: { previous_user_id: store.user_id },
    });

    return {
      success: true,
      message: `Toko "${store.name}" berhasil dilepas kaitannya (menjadi Data Awal).`,
    };
  }

  // Cek user tujuan
  const [targetUser] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    return { success: false, message: 'Akun warga tujuan tidak ditemukan.' };
  }

  // Cek apakah akun tujuan sudah memiliki toko lain (karena aturan 1 akun = 1 toko)
  const [existingStore] = await db
    .select({ id: schema.umkm.id, name: schema.umkm.name })
    .from(schema.umkm)
    .where(eq(schema.umkm.user_id, targetUserId))
    .limit(1);

  if (existingStore && existingStore.id !== umkmId) {
    return {
      success: false,
      message: `Akun ${targetUser.name} (${targetUser.email}) sudah memiliki toko "${existingStore.name}". Satu akun hanya boleh memiliki 1 toko.`,
    };
  }

  // Update kepemilikan toko secara atomik
  await db
    .update(schema.umkm)
    .set({
      user_id: targetUserId,
      claimed_at: new Date(),
    })
    .where(eq(schema.umkm.id, umkmId));

  invalidateCatalogCaches();

  await recordAuditLog({
    actorUserId: options.actorUserId,
    action: 'umkm.transfer_ownership',
    targetType: 'umkm',
    targetId: umkmId,
    metadata: {
      target_user_id: targetUserId,
      target_user_email: targetUser.email,
      previous_user_id: store.user_id,
    },
  });

  return {
    success: true,
    message: `Alhamdulillah! Toko "${store.name}" berhasil dilimpahkan ke ${targetUser.name} (${targetUser.email}).`,
  };
}
