import { and, desc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { NotificationItem } from './types';

type DbExecutor = Pick<ReturnType<typeof getDb>, 'insert'>;

export async function createNotification(
  params: {
    userId: number;
    title: string;
    body: string;
    link?: string;
  },
  executor?: DbExecutor
): Promise<void> {
  const runner = executor ?? getDb();
  await runner.insert(schema.notifications).values({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
    is_read: 0,
  });
}

export async function getNotificationsForUser(userId: number, limit = 15): Promise<NotificationItem[]> {
  const rows = await getDb()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.user_id, userId))
    .orderBy(desc(schema.notifications.created_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    body: r.body,
    link: r.link ?? undefined,
    is_read: r.is_read,
    created_at: r.created_at!.toISOString(),
  }));
}

export async function markNotificationRead(notificationId: number, userId: number): Promise<boolean> {
  const rows = await getDb()
    .update(schema.notifications)
    .set({ is_read: 1 })
    .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.user_id, userId)))
    .returning({ id: schema.notifications.id });

  return rows.length > 0;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await getDb()
    .update(schema.notifications)
    .set({ is_read: 1 })
    .where(eq(schema.notifications.user_id, userId));
}
