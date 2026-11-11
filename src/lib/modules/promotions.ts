import { desc, eq, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { AdPromotion } from './types';

export interface AdPackage {
  id: string;
  name: string;
  category: 'featured' | 'bump';
  days?: number;
  bumps?: number;
  price: number;
  formattedPrice: string;
  description: string;
  badgeLabel: string;
  popular?: boolean;
}

export const AD_PACKAGES: AdPackage[] = [
  // Paket Slot Iklan Unggulan (Featured)
  {
    id: 'featured_7d',
    name: 'Slot Unggulan 7 Hari',
    category: 'featured',
    days: 7,
    price: 10000,
    formattedPrice: 'Rp 10.000',
    description: 'Tampil teratas di halaman beranda & hasil pencarian selama 7 hari.',
    badgeLabel: '★ Iklan Pilihan',
  },
  {
    id: 'featured_14d',
    name: 'Slot Unggulan 14 Hari',
    category: 'featured',
    days: 14,
    price: 18000,
    formattedPrice: 'Rp 18.000',
    description: 'Prioritas tertinggi beranda + pencarian selama 14 hari penuh.',
    badgeLabel: '★ Rekomendasi MWC',
    popular: true,
  },
  {
    id: 'featured_30d',
    name: 'Slot Unggulan 30 Hari',
    category: 'featured',
    days: 30,
    price: 35000,
    formattedPrice: 'Rp 35.000',
    description: 'Promosi eksklusif sebulan penuh untuk akselerasi transaksi maksimal.',
    badgeLabel: '★ Mitra Unggulan NU',
  },

  // Paket Token Sundul (Bump Packs)
  {
    id: 'bump_pack_5',
    name: 'Paket 5x Token Sundul',
    category: 'bump',
    bumps: 5,
    price: 5000,
    formattedPrice: 'Rp 5.000',
    description: '5 token untuk menaikkan posisi iklan ke urutan pertama seketika tanpa batas kedaluwarsa.',
    badgeLabel: '⚡ 5x Sundul',
  },
  {
    id: 'bump_pack_12',
    name: 'Paket 12x Token Sundul',
    category: 'bump',
    bumps: 12,
    price: 10000,
    formattedPrice: 'Rp 10.000',
    description: '12 token sundul (Hemat 2 token) untuk menaikkan iklan setiap hari.',
    badgeLabel: '⚡ 12x Sundul',
    popular: true,
  },
  {
    id: 'bump_pack_30',
    name: 'Paket 30x Token Sundul',
    category: 'bump',
    bumps: 30,
    price: 20000,
    formattedPrice: 'Rp 20.000',
    description: '30 token sundul untuk toko dengan aktivitas penjualan intensif harian.',
    badgeLabel: '⚡ 30x Sundul',
  },
];

export function getPackageById(packageId: string): AdPackage | undefined {
  return AD_PACKAGES.find((p) => p.id === packageId);
}

export async function createAdOrder(data: {
  umkmId: number;
  productId?: number | null;
  userId: number;
  type: string;
  paymentMethod?: string;
  proofImageUrl?: string | null;
  notes?: string | null;
}): Promise<{ orderId: number; success: boolean }> {
  const pkg = getPackageById(data.type);
  const amount = pkg ? pkg.price : 10000;

  const [order] = await getDb()
    .insert(schema.adPromotions)
    .values({
      umkm_id: data.umkmId,
      product_id: data.productId || null,
      user_id: data.userId,
      type: data.type,
      amount,
      payment_method: data.paymentMethod || 'qris_manual',
      proof_image_url: data.proofImageUrl || null,
      notes: data.notes || null,
      status: 'pending',
    })
    .returning({ id: schema.adPromotions.id });

  return {
    orderId: order.id,
    success: true,
  };
}

export async function getAdOrdersByUmkm(umkmId: number): Promise<AdPromotion[]> {
  const rows = await getDb()
    .select({
      id: schema.adPromotions.id,
      umkm_id: schema.adPromotions.umkm_id,
      product_id: schema.adPromotions.product_id,
      product_name: schema.products.name,
      product_slug: schema.products.slug,
      user_id: schema.adPromotions.user_id,
      type: schema.adPromotions.type,
      amount: schema.adPromotions.amount,
      payment_method: schema.adPromotions.payment_method,
      proof_image_url: schema.adPromotions.proof_image_url,
      status: schema.adPromotions.status,
      notes: schema.adPromotions.notes,
      starts_at: schema.adPromotions.starts_at,
      expires_at: schema.adPromotions.expires_at,
      created_at: schema.adPromotions.created_at,
    })
    .from(schema.adPromotions)
    .leftJoin(schema.products, eq(schema.adPromotions.product_id, schema.products.id))
    .where(eq(schema.adPromotions.umkm_id, umkmId))
    .orderBy(desc(schema.adPromotions.created_at));

  return rows.map((r) => ({
    id: r.id,
    umkm_id: r.umkm_id,
    product_id: r.product_id ?? undefined,
    product_name: r.product_name ?? undefined,
    product_slug: r.product_slug ?? undefined,
    user_id: r.user_id,
    type: r.type,
    amount: r.amount,
    payment_method: r.payment_method,
    proof_image_url: r.proof_image_url ?? undefined,
    status: r.status as AdPromotion['status'],
    notes: r.notes ?? undefined,
    starts_at: r.starts_at ? r.starts_at.toISOString() : undefined,
    expires_at: r.expires_at ? r.expires_at.toISOString() : undefined,
    created_at: r.created_at!.toISOString(),
  }));
}

export async function getAllPendingAdOrders(): Promise<AdPromotion[]> {
  const rows = await getDb()
    .select({
      id: schema.adPromotions.id,
      umkm_id: schema.adPromotions.umkm_id,
      umkm_name: schema.umkm.name,
      product_id: schema.adPromotions.product_id,
      product_name: schema.products.name,
      product_slug: schema.products.slug,
      user_id: schema.adPromotions.user_id,
      user_email: schema.users.email,
      type: schema.adPromotions.type,
      amount: schema.adPromotions.amount,
      payment_method: schema.adPromotions.payment_method,
      proof_image_url: schema.adPromotions.proof_image_url,
      status: schema.adPromotions.status,
      notes: schema.adPromotions.notes,
      starts_at: schema.adPromotions.starts_at,
      expires_at: schema.adPromotions.expires_at,
      created_at: schema.adPromotions.created_at,
    })
    .from(schema.adPromotions)
    .innerJoin(schema.umkm, eq(schema.adPromotions.umkm_id, schema.umkm.id))
    .innerJoin(schema.users, eq(schema.adPromotions.user_id, schema.users.id))
    .leftJoin(schema.products, eq(schema.adPromotions.product_id, schema.products.id))
    .where(eq(schema.adPromotions.status, 'pending'))
    .orderBy(desc(schema.adPromotions.created_at));

  return rows.map((r) => ({
    id: r.id,
    umkm_id: r.umkm_id,
    umkm_name: r.umkm_name,
    product_id: r.product_id ?? undefined,
    product_name: r.product_name ?? undefined,
    product_slug: r.product_slug ?? undefined,
    user_id: r.user_id,
    user_email: r.user_email,
    type: r.type,
    amount: r.amount,
    payment_method: r.payment_method,
    proof_image_url: r.proof_image_url ?? undefined,
    status: r.status as AdPromotion['status'],
    notes: r.notes ?? undefined,
    starts_at: r.starts_at ? r.starts_at.toISOString() : undefined,
    expires_at: r.expires_at ? r.expires_at.toISOString() : undefined,
    created_at: r.created_at!.toISOString(),
  }));
}

export async function approveAdOrder(
  orderId: number,
  reviewerUserId: number
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const [order] = await db
    .select()
    .from(schema.adPromotions)
    .where(eq(schema.adPromotions.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, message: 'Pesanan iklan tidak ditemukan.' };
  }

  const pkg = getPackageById(order.type);
  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Featured Ad Activation
    if (pkg && pkg.category === 'featured' && order.product_id) {
      const days = pkg.days || 7;
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      await tx
        .update(schema.products)
        .set({
          is_featured: 1,
          featured_until: expiresAt,
        })
        .where(eq(schema.products.id, order.product_id));

      await tx
        .update(schema.adPromotions)
        .set({
          status: 'active',
          starts_at: now,
          expires_at: expiresAt,
          reviewed_by_user_id: reviewerUserId,
        })
        .where(eq(schema.adPromotions.id, orderId));
    }
    // 2. Bump Tokens Addition
    else if (pkg && pkg.category === 'bump') {
      const bumps = pkg.bumps || 5;

      await tx
        .update(schema.umkm)
        .set({
          bump_credits: sql`COALESCE(${schema.umkm.bump_credits}, 0) + ${bumps}`,
        })
        .where(eq(schema.umkm.id, order.umkm_id));

      await tx
        .update(schema.adPromotions)
        .set({
          status: 'active',
          starts_at: now,
          reviewed_by_user_id: reviewerUserId,
        })
        .where(eq(schema.adPromotions.id, orderId));
    } else {
      await tx
        .update(schema.adPromotions)
        .set({
          status: 'active',
          starts_at: now,
          reviewed_by_user_id: reviewerUserId,
        })
        .where(eq(schema.adPromotions.id, orderId));
    }
  });

  return { success: true, message: 'Alhamdulillah! Pesanan promosi iklan berhasil disetujui & diaktifkan.' };
}

export async function rejectAdOrder(
  orderId: number,
  reviewerUserId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  await getDb()
    .update(schema.adPromotions)
    .set({
      status: 'rejected',
      notes: reason || 'Bukti pembayaran tidak sesuai atau tidak valid.',
      reviewed_by_user_id: reviewerUserId,
    })
    .where(eq(schema.adPromotions.id, orderId));

  return { success: true, message: 'Pesanan iklan telah ditolak.' };
}
