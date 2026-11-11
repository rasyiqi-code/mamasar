import { and, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';

export async function getUserFavoriteIds(userId: number): Promise<number[]> {
  const rows = await getDb()
    .select({ productId: schema.favorites.product_id })
    .from(schema.favorites)
    .where(eq(schema.favorites.user_id, userId));
  return rows.map((r) => r.productId);
}

export async function toggleUserFavorite(userId: number, productId: number): Promise<{ favorited: boolean }> {
  const [existing] = await getDb()
    .select({ id: schema.favorites.id })
    .from(schema.favorites)
    .where(and(eq(schema.favorites.user_id, userId), eq(schema.favorites.product_id, productId)));

  if (existing) {
    await getDb().delete(schema.favorites).where(eq(schema.favorites.id, existing.id));
    return { favorited: false };
  } else {
    await getDb().insert(schema.favorites).values({
      user_id: userId,
      product_id: productId,
    });
    return { favorited: true };
  }
}

export async function syncGuestFavorites(userId: number, productIds: number[]): Promise<void> {
  if (!productIds || productIds.length === 0) return;
  for (const pid of productIds) {
    if (typeof pid === 'number' && pid > 0) {
      try {
        await getDb()
          .insert(schema.favorites)
          .values({ user_id: userId, product_id: pid })
          .onConflictDoNothing();
      } catch (_) {}
    }
  }
}
