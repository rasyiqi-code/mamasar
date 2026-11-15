import { desc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { getEnv } from '../neon';
import { recordAuditLog } from './audit';

export async function exportUserAccountData(userId: number) {
  const db = getDb();
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      agent_status: schema.users.agent_status,
      assigned_zone_id: schema.users.assigned_zone_id,
      agent_ranting: schema.users.agent_ranting,
      agent_org: schema.users.agent_org,
      agent_phone: schema.users.agent_phone,
      created_at: schema.users.created_at,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) return null;

  const [store] = await db
    .select()
    .from(schema.umkm)
    .where(eq(schema.umkm.user_id, userId))
    .limit(1);

  const products = store
    ? await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.umkm_id, store.id))
        .orderBy(desc(schema.products.created_at))
    : [];

  const cashbookEntries = await db
    .select()
    .from(schema.cashbook)
    .where(eq(schema.cashbook.user_id, userId))
    .orderBy(desc(schema.cashbook.transaction_date), desc(schema.cashbook.id));

  const favoriteRows = await db
    .select({
      product_id: schema.favorites.product_id,
      created_at: schema.favorites.created_at,
    })
    .from(schema.favorites)
    .where(eq(schema.favorites.user_id, userId));

  const adOrders = await db
    .select()
    .from(schema.adPromotions)
    .where(eq(schema.adPromotions.user_id, userId))
    .orderBy(desc(schema.adPromotions.created_at));

  const userNotifications = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.user_id, userId))
    .orderBy(desc(schema.notifications.created_at));

  return {
    exportedAt: new Date().toISOString(),
    platform: 'Mamasar Sumenep',
    user,
    store: store || null,
    products,
    cashbook: cashbookEntries,
    favorites: favoriteRows,
    adOrders,
    notifications: userNotifications,
  };
}

export async function deleteUserAccount(userId: number): Promise<void> {
  const db = getDb();
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('Akun tidak ditemukan.');
  }

  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  if (superadminEmail && user.email.trim().toLowerCase() === superadminEmail.trim().toLowerCase()) {
    throw new Error('Akun Superadmin utama dari konfigurasi server tidak dapat dihapus secara mandiri.');
  }

  await recordAuditLog({
    actorUserId: userId,
    action: 'user.account_delete',
    targetType: 'user',
    targetId: userId,
  });

  await db.transaction(async (tx) => {
    // Hapus etalase toko milik akun ini beserta produk dan ledger-nya (cascade)
    await tx.delete(schema.umkm).where(eq(schema.umkm.user_id, userId));
    // Hapus akun pengguna (sessions, favorites, cashbook, ad_promotions, notifications ikut cascade)
    await tx.delete(schema.users).where(eq(schema.users.id, userId));
  });
}
