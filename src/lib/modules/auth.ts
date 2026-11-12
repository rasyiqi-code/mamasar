import { and, desc, eq, gt, lt, getTableColumns, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { getEnv } from '../neon';
import type { User, UMKM } from './types';

export function isPCNU(user?: { role?: string; email?: string } | null): boolean {
  if (!user) return false;
  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  if (superadminEmail && user.email?.toLowerCase() === superadminEmail.toLowerCase()) {
    return true;
  }
  return user.role === 'pcnu' || (user.role as any) === 'superadmin';
}
export const isSuperadmin = isPCNU;

export function isMWCNU(user?: { role?: string; email?: string } | null): boolean {
  if (!user) return false;
  return user.role === 'mwcnu' || isPCNU(user);
}
export const isPengurus = isMWCNU;

export function isRanting(user?: { role?: string; agent_status?: string; email?: string } | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ranting' ||
    user.role === 'mwcnu' ||
    user.agent_status === 'active' ||
    isPCNU(user)
  );
}
export const isPetugas = isRanting;

export function isMerchant(user?: { role?: string; umkm?: any } | null): boolean {
  if (!user) return false;
  return Boolean(user.umkm);
}

export function toUser(row: typeof schema.users.$inferSelect, zoneName?: string): User {
  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  const isSuper = Boolean(superadminEmail && row.email.toLowerCase() === superadminEmail.toLowerCase());
  const effectiveRole = isSuper ? 'pcnu' : (row.role as User['role']);

  return {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url ?? undefined,
    role: effectiveRole,
    agent_status: (row.agent_status as User['agent_status']) || 'none',
    assigned_zone_id: row.assigned_zone_id ?? undefined,
    assigned_zone_name: zoneName,
    agent_ranting: row.agent_ranting ?? undefined,
    agent_org: row.agent_org ?? undefined,
    agent_phone: row.agent_phone ?? undefined,
    created_at: row.created_at!.toISOString(),
  };
}

export async function findOrCreateUserByGoogle(data: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<User> {
  const normalizedEmail = data.email.trim().toLowerCase();

  const [existingByGoogle] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.google_id, data.googleId));

  if (existingByGoogle) {
    const nextName = data.name || existingByGoogle.name;
    const nextAvatar = data.avatarUrl || existingByGoogle.avatar_url;
    if (nextName !== existingByGoogle.name || nextAvatar !== existingByGoogle.avatar_url) {
      await getDb()
        .update(schema.users)
        .set({ name: nextName, avatar_url: nextAvatar })
        .where(eq(schema.users.id, existingByGoogle.id));
    }
    return { ...toUser(existingByGoogle), name: nextName, avatar_url: nextAvatar ?? undefined };
  }

  const [existingByEmail] = await getDb()
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${normalizedEmail}`);

  if (existingByEmail) {
    const nextName = data.name || existingByEmail.name;
    const nextAvatar = data.avatarUrl || existingByEmail.avatar_url;
    const shouldLinkGoogleId = existingByEmail.google_id.startsWith('pre_') && !data.googleId.startsWith('pre_');
    const nextGoogleId = shouldLinkGoogleId ? data.googleId : existingByEmail.google_id;
    if (
      nextName !== existingByEmail.name ||
      nextAvatar !== existingByEmail.avatar_url ||
      shouldLinkGoogleId
    ) {
      await getDb()
        .update(schema.users)
        .set({ name: nextName, avatar_url: nextAvatar, google_id: nextGoogleId })
        .where(eq(schema.users.id, existingByEmail.id));
    }
    return {
      ...toUser({ ...existingByEmail, google_id: nextGoogleId }),
      name: nextName,
      avatar_url: nextAvatar ?? undefined,
    };
  }

  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  const isSuper = Boolean(superadminEmail && normalizedEmail === superadminEmail.toLowerCase());

  const [created] = await getDb()
    .insert(schema.users)
    .values({
      google_id: data.googleId,
      email: normalizedEmail,
      name: data.name,
      avatar_url: data.avatarUrl || '',
      role: isSuper ? 'pcnu' : 'warga',
      agent_status: 'none',
    })
    .returning();

  return toUser(created);
}

export async function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }): Promise<void> {
  const [existing] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId));
  if (!existing) return;
  await getDb()
    .update(schema.users)
    .set({ name: data.name || existing.name, avatar_url: data.avatarUrl || existing.avatar_url })
    .where(eq(schema.users.id, userId));
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await getDb().insert(schema.sessions).values({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (Math.random() < 0.05) {
    purgeExpiredSessions().catch(() => {});
  }

  return sessionId;
}

export async function getOrCreateSessionForUser(userId: number): Promise<string> {
  const [existing] = await getDb()
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.user_id, userId), gt(schema.sessions.expires_at, new Date())))
    .orderBy(desc(schema.sessions.expires_at))
    .limit(1);

  if (existing) return existing.id;
  return createSession(userId);
}

export async function purgeExpiredSessions(): Promise<number> {
  const rows = await getDb()
    .delete(schema.sessions)
    .where(lt(schema.sessions.expires_at, new Date()))
    .returning({ id: schema.sessions.id });
  return rows.length;
}

export async function getUserFromSession(sessionId: string): Promise<(User & { umkm?: UMKM & { zone_name: string; zone_slug: string } }) | null> {
  if (!sessionId) return null;

  const [row] = await getDb()
    .select({
      ...getTableColumns(schema.users),
      expires_at: schema.sessions.expires_at,
      umkm_id: schema.umkm.id,
      umkm_name: schema.umkm.name,
      umkm_phone: schema.umkm.phone,
      umkm_zone_id: schema.umkm.zone_id,
      umkm_is_verified: schema.umkm.is_verified,
      umkm_address: schema.umkm.address,
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.user_id, schema.users.id))
    .leftJoin(schema.umkm, eq(schema.umkm.user_id, schema.users.id))
    .leftJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id))
    .where(eq(schema.sessions.id, sessionId));

  if (!row) return null;

  if (row.expires_at.getTime() < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  const isSuper = Boolean(superadminEmail && row.email.toLowerCase() === superadminEmail.toLowerCase());
  const effectiveRole = isSuper ? 'pcnu' : (row.role as User['role']);

  const user: User & { umkm?: UMKM & { zone_name: string; zone_slug: string } } = {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url ?? undefined,
    role: effectiveRole,
    agent_status: (row.agent_status as User['agent_status']) || 'none',
    assigned_zone_id: row.assigned_zone_id ?? undefined,
    agent_ranting: row.agent_ranting ?? undefined,
    agent_org: row.agent_org ?? undefined,
    agent_phone: row.agent_phone ?? undefined,
    created_at: row.created_at!.toISOString(),
  };

  if (row.umkm_id != null && row.zone_name != null && row.zone_slug != null) {
    user.umkm = {
      id: row.umkm_id,
      user_id: row.id,
      name: row.umkm_name!,
      phone: row.umkm_phone!,
      zone_id: row.umkm_zone_id!,
      zone_name: row.zone_name,
      zone_slug: row.zone_slug,
      is_verified: row.umkm_is_verified ?? 1,
      address: row.umkm_address ?? undefined,
    };
  }

  return user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  } catch (_) {}
}

export async function deleteUserSessions(userId: number): Promise<void> {
  try {
    await getDb().delete(schema.sessions).where(eq(schema.sessions.user_id, userId));
  } catch (_) {}
}
