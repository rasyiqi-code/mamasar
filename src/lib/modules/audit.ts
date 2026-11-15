import { desc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { AuditLogEntry } from './types';

type DbExecutor = Pick<ReturnType<typeof getDb>, 'insert'>;

export async function recordAuditLog(
  params: {
    actorUserId?: number | null;
    action: string;
    targetType: string;
    targetId?: number | null;
    metadata?: Record<string, unknown>;
  },
  executor?: DbExecutor
): Promise<void> {
  const runner = executor ?? getDb();
  await runner.insert(schema.auditLog).values({
    actor_user_id: params.actorUserId ?? null,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    metadata_json: params.metadata ? JSON.stringify(params.metadata) : null,
  });
}

export async function getRecentAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.created_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actor_user_id: r.actor_user_id ?? undefined,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id ?? undefined,
    metadata_json: r.metadata_json ?? undefined,
    created_at: r.created_at!.toISOString(),
  }));
}

export async function getAuditLogsByActor(actorUserId: number, limit = 30): Promise<AuditLogEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.actor_user_id, actorUserId))
    .orderBy(desc(schema.auditLog.created_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actor_user_id: r.actor_user_id ?? undefined,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id ?? undefined,
    metadata_json: r.metadata_json ?? undefined,
    created_at: r.created_at!.toISOString(),
  }));
}
