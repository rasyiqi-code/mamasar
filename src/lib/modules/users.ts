import { desc, eq, inArray, or, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import { getEnv } from '../neon';
import { formatPhoneForWhatsApp } from '../utils';
import type { AdminUserRow, AgentStatus, PendingPetugasRow, UserRole } from './types';

const VALID_ROLES: UserRole[] = ['warga', 'ranting', 'mwcnu', 'pcnu'];

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

function isEnvSuperadminEmail(email: string): boolean {
  const superadminEmail = getEnv('SUPERADMIN_EMAIL');
  return Boolean(superadminEmail && email.trim().toLowerCase() === superadminEmail.trim().toLowerCase());
}

/**
 * Mengajukan pendaftaran akun sebagai Kader Ranting atau Pengurus MWC NU.
 */
export async function registerPetugas(
  userId: number,
  data: {
    phone: string;
    zoneId: number;
    org: string;
    ranting?: string;
    requestedRole?: 'ranting' | 'mwcnu';
  }
): Promise<boolean> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const pendingStatus: AgentStatus = data.requestedRole === 'mwcnu' ? 'pending_mwcnu' : 'pending';

  await getDb()
    .update(schema.users)
    .set({
      agent_phone: cleanPhone,
      assigned_zone_id: data.zoneId,
      agent_ranting: data.ranting || null,
      agent_org: data.org,
      agent_status: pendingStatus,
    })
    .where(eq(schema.users.id, userId));
  return true;
}

/**
 * Mengambil antrean permohonan Kader Ranting & Pengurus MWC NU yang menunggu persetujuan.
 */
export async function getPendingPetugas(): Promise<PendingPetugasRow[]> {
  const rows = await getDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      avatar_url: schema.users.avatar_url,
      agent_phone: schema.users.agent_phone,
      agent_ranting: schema.users.agent_ranting,
      agent_org: schema.users.agent_org,
      agent_status: schema.users.agent_status,
      assigned_zone_id: schema.users.assigned_zone_id,
      zone_name: schema.zones.name,
      created_at: schema.users.created_at,
    })
    .from(schema.users)
    .leftJoin(schema.zones, eq(schema.users.assigned_zone_id, schema.zones.id))
    .where(inArray(schema.users.agent_status, ['pending', 'pending_mwcnu']))
    .orderBy(desc(schema.users.created_at));

  return rows.map((r) => ({
    ...r,
    agent_status: (r.agent_status as AgentStatus) || 'pending',
    requested_role: r.agent_status === 'pending_mwcnu' ? 'mwcnu' : 'ranting',
    created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Mengambil daftar seluruh petugas dan pengurus aktif maupun pending.
 */
export async function getAllPetugas(): Promise<any[]> {
  const rows = await getDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      avatar_url: schema.users.avatar_url,
      agent_phone: schema.users.agent_phone,
      agent_ranting: schema.users.agent_ranting,
      agent_org: schema.users.agent_org,
      agent_status: schema.users.agent_status,
      assigned_zone_id: schema.users.assigned_zone_id,
      zone_name: schema.zones.name,
      created_at: schema.users.created_at,
    })
    .from(schema.users)
    .leftJoin(schema.zones, eq(schema.users.assigned_zone_id, schema.zones.id))
    .where(
      or(
        eq(schema.users.role, 'ranting'),
        eq(schema.users.role, 'mwcnu'),
        eq(schema.users.role, 'pcnu'),
        inArray(schema.users.agent_status, ['active', 'pending', 'pending_mwcnu'])
      )
    )
    .orderBy(desc(schema.users.created_at));

  return rows.map((r) => ({
    ...r,
    created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Memproses persetujuan atau penolakan pengajuan Kader Ranting / Pengurus MWC NU.
 */
export async function reviewPetugas(
  userId: number,
  action: 'approve' | 'reject',
  targetRole?: 'ranting' | 'mwcnu'
): Promise<boolean> {
  const newStatus: AgentStatus = action === 'approve' ? 'active' : 'rejected';
  const newRole: UserRole =
    action === 'approve' ? (targetRole === 'mwcnu' ? 'mwcnu' : 'ranting') : 'warga';

  await getDb()
    .update(schema.users)
    .set({
      agent_status: newStatus,
      role: newRole,
    })
    .where(eq(schema.users.id, userId));
  return true;
}

/**
 * Mengambil daftar seluruh pengguna terdaftar untuk konsol manajemen akun & peran Superadmin.
 */
export async function getAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const rows = await getDb()
    .select({
      id: schema.users.id,
      google_id: schema.users.google_id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      agent_status: schema.users.agent_status,
      assigned_zone_id: schema.users.assigned_zone_id,
      zone_name: schema.zones.name,
      agent_ranting: schema.users.agent_ranting,
      agent_org: schema.users.agent_org,
      agent_phone: schema.users.agent_phone,
      umkm_id: schema.umkm.id,
      umkm_name: schema.umkm.name,
      created_at: schema.users.created_at,
    })
    .from(schema.users)
    .leftJoin(schema.zones, eq(schema.users.assigned_zone_id, schema.zones.id))
    .leftJoin(schema.umkm, eq(schema.umkm.user_id, schema.users.id))
    .orderBy(desc(schema.users.created_at));

  const roleRank: Record<UserRole, number> = {
    pcnu: 0,
    mwcnu: 1,
    ranting: 2,
    warga: 3,
  };

  const mapped: AdminUserRow[] = rows.map((r) => {
    const isEnvSuper = isEnvSuperadminEmail(r.email);
    const effectiveRole: UserRole = isEnvSuper ? 'pcnu' : ((r.role as UserRole) || 'warga');
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      role: effectiveRole,
      agent_status: (r.agent_status as AgentStatus) || 'none',
      assigned_zone_id: r.assigned_zone_id ?? null,
      zone_name: r.zone_name ?? null,
      agent_ranting: r.agent_ranting ?? null,
      agent_org: r.agent_org ?? null,
      agent_phone: r.agent_phone ?? null,
      umkm_id: r.umkm_id ?? null,
      umkm_name: r.umkm_name ?? null,
      is_env_superadmin: isEnvSuper,
      is_pending_login: r.google_id.startsWith('pre_'),
      created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
    };
  });

  mapped.sort((a, b) => roleRank[a.role] - roleRank[b.role]);
  return mapped;
}

export interface RoleUpdateInput {
  role: UserRole;
  zoneId?: number | null;
  ranting?: string | null;
  org?: string | null;
  phone?: string | null;
}

function normalizeRolePayload(input: RoleUpdateInput): {
  role: UserRole;
  agentStatus: AgentStatus;
  zoneId: number | null;
  ranting: string | null;
  org: string | null;
  phone: string | null;
} {
  if (!isValidRole(input.role)) {
    throw new Error('Peran pengguna tidak valid.');
  }

  const zoneId = input.zoneId && Number.isFinite(input.zoneId) ? Number(input.zoneId) : null;
  if ((input.role === 'ranting' || input.role === 'mwcnu') && !zoneId) {
    throw new Error('Wilayah MWC NU wajib dipilih untuk Kader Ranting atau Pengurus MWC.');
  }

  const ranting = input.ranting?.trim() || null;
  const org = input.org?.trim() || null;
  const phone = input.phone?.trim() ? formatPhoneForWhatsApp(input.phone.trim()) : null;

  return {
    role: input.role,
    agentStatus: input.role === 'warga' ? 'none' : 'active',
    zoneId: input.role === 'warga' ? null : zoneId,
    ranting: input.role === 'warga' ? null : ranting,
    org: input.role === 'warga' ? null : org,
    phone: input.role === 'warga' ? null : phone,
  };
}

/**
 * Mengubah peran dan penugasan wilayah pengguna yang sudah terdaftar dari konsol Admin.
 */
export async function updateUserRoleByAdmin(
  targetUserId: number,
  input: RoleUpdateInput
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, targetUserId))
    .limit(1);

  if (!existing) {
    throw new Error('Akun pengguna tidak ditemukan.');
  }

  if (isEnvSuperadminEmail(existing.email) && input.role !== 'pcnu') {
    throw new Error('Akun Superadmin utama dari konfigurasi server tidak dapat diturunkan perannya.');
  }

  const next = normalizeRolePayload(input);
  await db
    .update(schema.users)
    .set({
      role: next.role,
      agent_status: next.agentStatus,
      assigned_zone_id: next.zoneId,
      agent_ranting: next.ranting !== null ? next.ranting : next.role === 'warga' ? null : existing.agent_ranting,
      agent_org: next.org !== null ? next.org : next.role === 'warga' ? null : existing.agent_org,
      agent_phone: next.phone !== null ? next.phone : next.role === 'warga' ? null : existing.agent_phone,
    })
    .where(eq(schema.users.id, targetUserId));
}

/**
 * Mendaftarkan atau menetapkan akun baru via email dengan peran tertentu dari konsol Admin.
 * Jika email sudah terdaftar, perannya langsung diperbarui.
 */
export async function createOrPreRegisterUserByAdmin(
  input: RoleUpdateInput & { name: string; email: string }
): Promise<{ mode: 'created' | 'updated'; email: string }> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim();

  if (!cleanName) {
    throw new Error('Nama lengkap wajib diisi.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  if (isEnvSuperadminEmail(cleanEmail) && input.role !== 'pcnu') {
    throw new Error('Akun Superadmin utama dari konfigurasi server selalu memiliki peran Admin PCNU.');
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${cleanEmail}`)
    .limit(1);

  if (existing) {
    await updateUserRoleByAdmin(existing.id, input);
    return { mode: 'updated', email: cleanEmail };
  }

  const next = normalizeRolePayload(input);
  const preGoogleId = `pre_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  await db.insert(schema.users).values({
    google_id: preGoogleId,
    email: cleanEmail,
    name: cleanName,
    avatar_url: '',
    role: next.role,
    agent_status: next.agentStatus,
    assigned_zone_id: next.zoneId,
    agent_ranting: next.ranting,
    agent_org: next.org,
    agent_phone: next.phone,
  });

  return { mode: 'created', email: cleanEmail };
}
