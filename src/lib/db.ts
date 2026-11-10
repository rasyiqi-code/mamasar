import { and, asc, desc, eq, gt, getTableColumns, gte, ilike, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { getNeonSql } from './neon';
import { formatPhoneForWhatsApp, slugify } from './utils';

/**
 * Data layer for Neon PostgreSQL, built on Drizzle ORM.
 *
 * All functions are async: queries run over the Neon serverless HTTP
 * driver, so state survives across serverless instances (Vercel) and is
 * shared by every request. Table definitions live in ./schema.ts; the DDL
 * source of truth is scripts/migrate-neon.js.
 *
 * TIMESTAMP WITH TIME ZONE columns come back as Date objects; the mappers
 * below convert them to ISO strings so the exported interfaces keep the
 * string shapes the rest of the app was built against.
 */

type Database = NeonHttpDatabase<typeof schema>;

let dbInstance: Database | null = null;

function getDb(): Database {
  // Lazy init so importing this module never crashes environments without
  // DATABASE_URL (build time, unit tests); the error surfaces on first query.
  if (!dbInstance) {
    dbInstance = drizzle(getNeonSql(), { schema });
  }
  return dbInstance;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  image_url: string;
  summary: string;
  content?: string;
  created_at: string;
}

function toArticle(row: typeof schema.articles.$inferSelect): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    image_url: row.image_url,
    summary: row.summary,
    content: row.content ?? undefined,
    // Set by DEFAULT CURRENT_TIMESTAMP on every insert path; never NULL.
    created_at: row.created_at!.toISOString(),
  };
}

export async function getArticles(): Promise<Article[]> {
  const rows = await getDb().select().from(schema.articles).orderBy(asc(schema.articles.id));
  return rows.map(toArticle);
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const [row] = await getDb().select().from(schema.articles).where(eq(schema.articles.slug, slug));
  return row ? toArticle(row) : undefined;
}

export interface EventItem {
  id: number;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
  title: string;
  slug: string;
  organizer: string;
  event_date: string;
  time_description: string;
  location_name: string;
  location_address?: string;
  estimated_attendance: number;
  consumption_needed?: string;
  allow_stalls: number;
  coordinator_name?: string;
  coordinator_phone: string;
  created_at: string;
}

type EventRow = typeof schema.events.$inferSelect & { zone_name: string; zone_slug: string };

function toEventItem(row: EventRow): EventItem {
  return {
    id: row.id,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    title: row.title,
    slug: row.slug,
    organizer: row.organizer,
    event_date: row.event_date.toISOString(),
    time_description: row.time_description,
    location_name: row.location_name,
    location_address: row.location_address ?? undefined,
    estimated_attendance: row.estimated_attendance ?? 0,
    consumption_needed: row.consumption_needed ?? undefined,
    allow_stalls: row.allow_stalls ?? 1,
    coordinator_name: row.coordinator_name ?? undefined,
    coordinator_phone: row.coordinator_phone,
    created_at: row.created_at!.toISOString(),
  };
}

function eventSelect() {
  return getDb()
    .select({
      ...getTableColumns(schema.events),
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.events)
    .innerJoin(schema.zones, eq(schema.events.zone_id, schema.zones.id));
}

export async function getEvents(options?: { zoneSlug?: string }): Promise<EventItem[]> {
  const conditions: SQL[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  const rows = await eventSelect()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(schema.events.event_date), asc(schema.events.id));
  return rows.map(toEventItem);
}

export async function getEventBySlug(slug: string): Promise<EventItem | undefined> {
  const [row] = await eventSelect().where(eq(schema.events.slug, slug));
  return row ? toEventItem(row) : undefined;
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

function toUser(row: typeof schema.users.$inferSelect): User {
  return {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url ?? undefined,
    created_at: row.created_at!.toISOString(),
  };
}

export interface Zone {
  id: number;
  name: string;
  slug: string;
}

export interface UMKM {
  id: number;
  user_id?: number;
  name: string;
  phone: string;
  zone_id: number;
  zone_name?: string;
  is_verified: number;
  address?: string;
}

export interface Product {
  id: number;
  umkm_id: number;
  umkm_name: string;
  umkm_phone: string;
  umkm_address: string;
  is_verified: number;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  image_url: string;
  description: string;
  views?: number;
  is_sold_out?: number;
  bumped_at?: string;
  shopee_url?: string;
  created_at: string;
}

export interface CashbookEntry {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

type UMKMJoinRow = typeof schema.umkm.$inferSelect & { zone_name: string; zone_slug: string };

function toUMKM(row: UMKMJoinRow): UMKM & { zone_name: string; zone_slug: string } {
  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: row.name,
    phone: row.phone,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    is_verified: row.is_verified ?? 1,
    address: row.address ?? undefined,
  };
}

type ProductRow = typeof schema.products.$inferSelect & {
  umkm_name: string;
  umkm_phone: string;
  umkm_address: string | null;
  is_verified: number | null;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    umkm_id: row.umkm_id,
    umkm_name: row.umkm_name,
    umkm_phone: row.umkm_phone,
    umkm_address: row.umkm_address ?? '',
    is_verified: row.is_verified ?? 1,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    zone_slug: row.zone_slug,
    name: row.name,
    slug: row.slug,
    price: row.price,
    category: row.category,
    image_url: row.image_url,
    description: row.description ?? '',
    views: row.views ?? 0,
    is_sold_out: row.is_sold_out ?? 0,
    bumped_at: row.bumped_at ? row.bumped_at.toISOString() : undefined,
    shopee_url: row.shopee_url ?? undefined,
    created_at: row.created_at!.toISOString(),
  };
}

/**
 * Shared products+umkm+zones join used by every catalog query, mirroring
 * the previous `SELECT p.*, u.*, z.*` SQL shape.
 */
function productSelect() {
  return getDb()
    .select({
      ...getTableColumns(schema.products),
      umkm_name: schema.umkm.name,
      umkm_phone: schema.umkm.phone,
      umkm_address: schema.umkm.address,
      is_verified: schema.umkm.is_verified,
      zone_id: schema.zones.id,
      zone_name: schema.zones.name,
      zone_slug: schema.zones.slug,
    })
    .from(schema.products)
    .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
    .innerJoin(schema.zones, eq(schema.umkm.zone_id, schema.zones.id));
}

const lastBumpedFirst = [
  desc(sql`COALESCE(${schema.products.bumped_at}, ${schema.products.created_at})`),
  desc(schema.products.id),
];

export async function getAllZones(): Promise<(Zone & { count?: number })[]> {
  const zoneRows = await getDb().select().from(schema.zones).orderBy(asc(schema.zones.name));

  const countRows = await getDb()
    .select({ zone_id: schema.umkm.zone_id, count: sql<number>`count(${schema.products.id})::int` })
    .from(schema.products)
    .innerJoin(schema.umkm, eq(schema.products.umkm_id, schema.umkm.id))
    .groupBy(schema.umkm.zone_id);

  const countMap = new Map(countRows.map((c) => [c.zone_id, c.count]));

  return zoneRows.map((z) => ({
    ...z,
    count: countMap.get(z.id) ?? 0,
  }));
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

export async function getProducts(options?: {
  zoneSlug?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}): Promise<Product[]> {
  const conditions: SQL[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    conditions.push(eq(schema.zones.slug, options.zoneSlug));
  }

  if (options?.category && options.category !== 'semua') {
    conditions.push(eq(schema.products.category, options.category));
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
  category: string;
  imageUrl: string;
  description?: string;
  shopeeUrl?: string;
}): Promise<{ umkmId: number; productId: number; slug: string }> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  const [umkmRow] = await getDb()
    .insert(schema.umkm)
    .values({
      name: data.umkmName,
      phone: cleanPhone,
      zone_id: data.zoneId,
      // Every user-submitted store (dashboard or /agen) starts unverified;
      // pengurus MWC flip it to verified after checking the member.
      is_verified: 0,
      address: data.address || '',
    })
    .returning({ id: schema.umkm.id });

  const [productRow] = await getDb()
    .insert(schema.products)
    .values({
      umkm_id: umkmRow.id,
      name: data.productName,
      slug: uniqueSlug,
      price: data.price,
      category: data.category,
      image_url: data.imageUrl,
      description: data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`,
      shopee_url: data.shopeeUrl || null,
    })
    .returning({ id: schema.products.id });

  return {
    umkmId: umkmRow.id,
    productId: productRow.id,
    slug: uniqueSlug,
  };
}

/**
 * Increment view count for a product
 */
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

/**
 * Bump / Naikkan produk to the top of catalog listings
 */
export async function bumpProduct(productId: number, umkmId?: number): Promise<boolean> {
  const conditions = [eq(schema.products.id, productId)];
  if (umkmId) {
    conditions.push(eq(schema.products.umkm_id, umkmId));
  }

  const rows = await getDb()
    .update(schema.products)
    .set({ bumped_at: new Date() })
    .where(and(...conditions))
    .returning({ id: schema.products.id });
  return rows.length > 0;
}

/**
 * Toggle product stock status (Available vs Sold Out).
 * Single atomic UPDATE, so concurrent toggles cannot overwrite each other.
 */
export async function toggleProductStock(productId: number, umkmId?: number): Promise<{ success: boolean; is_sold_out: number }> {
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

/**
 * Delete product from catalog
 */
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

/**
 * Find or create user via Google OAuth profile
 */
export async function findOrCreateUserByGoogle(data: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<User> {
  // First try to find by google_id (most reliable)
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

  // Only check email if no google_id match found
  const [existingByEmail] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email));

  if (existingByEmail) {
    const nextName = data.name || existingByEmail.name;
    const nextAvatar = data.avatarUrl || existingByEmail.avatar_url;
    if (nextName !== existingByEmail.name || nextAvatar !== existingByEmail.avatar_url) {
      await getDb()
        .update(schema.users)
        .set({ name: nextName, avatar_url: nextAvatar })
        .where(eq(schema.users.id, existingByEmail.id));
    }
    return { ...toUser(existingByEmail), name: nextName, avatar_url: nextAvatar ?? undefined };
  }

  // Create new user
  const [created] = await getDb()
    .insert(schema.users)
    .values({
      google_id: data.googleId,
      email: data.email,
      name: data.name,
      avatar_url: data.avatarUrl || '',
    })
    .returning({ id: schema.users.id });

  return {
    id: created.id,
    google_id: data.googleId,
    email: data.email,
    name: data.name,
    avatar_url: data.avatarUrl,
    created_at: new Date().toISOString(),
  };
}

export async function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }): Promise<void> {
  const [existing] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId));
  if (!existing) return;
  await getDb()
    .update(schema.users)
    .set({ name: data.name || existing.name, avatar_url: data.avatarUrl || existing.avatar_url })
    .where(eq(schema.users.id, userId));
}

/**
 * Create a secure session token for user
 */
export async function createSession(userId: number): Promise<string> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  // 30 days expiration
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await getDb().insert(schema.sessions).values({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  // Opportunistic janitor: expired sessions are purged on ~1/20th of logins,
  // keeping the sessions table from growing forever without a cron job.
  if (Math.random() < 0.05) {
    purgeExpiredSessions().catch(() => {});
  }

  return sessionId;
}

/**
 * Reuse the newest still-valid session for a user, or create a new one.
 * Prevents Neon Auth page loads from inserting one session row per request.
 */
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

/**
 * Delete sessions that are past their expiration date.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const rows = await getDb()
    .delete(schema.sessions)
    .where(lt(schema.sessions.expires_at, new Date()))
    .returning({ id: schema.sessions.id });
  return rows.length;
}

/**
 * Get user and their UMKM store from session token
 */
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

  // Check expiration
  if (row.expires_at.getTime() < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  const user: User & { umkm?: UMKM & { zone_name: string; zone_slug: string } } = {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url ?? undefined,
    created_at: row.created_at!.toISOString(),
  };

  // The zone join is only nullable when the umkm join is; require both.
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

/**
 * Delete a session on logout
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  } catch (_) {}
}

/**
 * Get UMKM store owned by a user
 */
export async function getUMKMByUserId(userId: number): Promise<(UMKM & { zone_name: string; zone_slug: string; products: Product[] }) | undefined> {
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

export interface ClaimCandidate {
  id: number;
  name: string;
  zone_name: string;
}

export type SetupUMKMResult =
  | { outcome: 'linked'; storeId: number; claimed: boolean }
  | { outcome: 'claim_available'; candidate: ClaimCandidate }
  | { outcome: 'claim_failed' };

/**
 * Find an orphan store (created via /agen without an owner account) whose
 * phone matches the seller's WhatsApp number. Oldest first, so repeated
 * agent entries resolve to the same candidate.
 */
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

/**
 * Link an orphan store to its real owner. Guarded by `user_id IS NULL` and
 * the phone match, so a guessed store id cannot steal a store and two
 * racing sellers cannot both claim it.
 */
async function claimOrphanUMKM(userId: number, storeId: number, cleanPhone: string): Promise<number | undefined> {
  const [row] = await getDb()
    .update(schema.umkm)
    .set({ user_id: userId })
    .where(and(eq(schema.umkm.id, storeId), isNull(schema.umkm.user_id), eq(schema.umkm.phone, cleanPhone)))
    .returning({ id: schema.umkm.id });
  return row?.id;
}

/**
 * Save the store profile for an authenticated seller.
 *
 * Orphan stores from the /agen field survey carry the seller's phone number,
 * so a seller registering with the same number is offered the claim instead
 * of silently creating a duplicate store. `claimStoreId` accepts the offer,
 * `skipClaim` declines it and forces a fresh store.
 */
export async function setupUMKMForUser(
  userId: number,
  data: {
    name: string;
    phone: string;
    zoneId: number;
    address?: string;
  },
  options?: { claimStoreId?: number; skipClaim?: boolean }
): Promise<SetupUMKMResult> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  // Sellers with an existing store just update their profile; the claim
  // options are ignored so a stale confirm panel cannot hijack another store.
  const [existing] = await getDb()
    .select({ id: schema.umkm.id })
    .from(schema.umkm)
    .where(eq(schema.umkm.user_id, userId));

  if (existing) {
    await getDb()
      .update(schema.umkm)
      .set({ name: data.name, phone: cleanPhone, zone_id: data.zoneId, address: data.address || '' })
      .where(eq(schema.umkm.id, existing.id));
    return { outcome: 'linked', storeId: existing.id, claimed: false };
  }

  if (options?.claimStoreId) {
    const claimed = await claimOrphanUMKM(userId, options.claimStoreId, cleanPhone);
    if (!claimed) return { outcome: 'claim_failed' };

    // Refresh the claimed profile with what the seller typed in the form;
    // the phone already matches, so it is kept as-is.
    await getDb()
      .update(schema.umkm)
      .set({ name: data.name, zone_id: data.zoneId, address: data.address || '' })
      .where(eq(schema.umkm.id, claimed));
    return { outcome: 'linked', storeId: claimed, claimed: true };
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
      // Self-registered stores are unverified until a pengurus MWC confirms
      // the member; only LPNU seed data starts verified.
      is_verified: 0,
      address: data.address || '',
    })
    .returning({ id: schema.umkm.id });

  return { outcome: 'linked', storeId: created.id, claimed: false };
}

/**
 * Add product directly to an existing UMKM store
 */
export async function addProductToUMKM(umkmId: number, data: {
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  description?: string;
  shopeeUrl?: string;
}): Promise<{ productId: number; slug: string }> {
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
      category: data.category,
      image_url: data.imageUrl,
      description: data.description || `${data.name} dari ${storeName}, Sumenep.`,
      shopee_url: data.shopeeUrl || null,
      bumped_at: new Date(),
    })
    .returning({ id: schema.products.id });

  return {
    productId: created.id,
    slug: uniqueSlug,
  };
}

/**
 * Mini Buku Kas Penjualan Santri (Slide 4 LPNU: Buku Kas Penjualan Santri)
 */
export async function getCashbookEntries(userId: number, limit: number = 30): Promise<CashbookEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.cashbook)
    .where(eq(schema.cashbook.user_id, userId))
    .orderBy(desc(schema.cashbook.transaction_date), desc(schema.cashbook.id))
    .limit(limit);
  return rows.map(toCashbookEntry);
}

function toCashbookEntry(row: typeof schema.cashbook.$inferSelect): CashbookEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    amount: row.amount,
    type: row.type,
    category: row.category ?? 'Penjualan',
    notes: row.notes ?? undefined,
    transaction_date: row.transaction_date ?? '',
    created_at: row.created_at!.toISOString(),
  };
}

export async function getCashbookSummary(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const [row] = await getDb()
    .select({
      // SUM() over integers is bigint, which the driver returns as string.
      total_income: sql<string | number>`COALESCE(SUM(CASE WHEN ${schema.cashbook.type} = 'income' THEN ${schema.cashbook.amount} ELSE 0 END), 0)`,
      total_expense: sql<string | number>`COALESCE(SUM(CASE WHEN ${schema.cashbook.type} = 'expense' THEN ${schema.cashbook.amount} ELSE 0 END), 0)`,
    })
    .from(schema.cashbook)
    .where(eq(schema.cashbook.user_id, userId));

  const totalIncome = Number(row?.total_income ?? 0);
  const totalExpense = Number(row?.total_expense ?? 0);
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function addCashbookEntry(userId: number, data: {
  title: string;
  amount: number;
  type?: 'income' | 'expense';
  category?: string;
  notes?: string;
  transactionDate?: string;
}): Promise<CashbookEntry> {
  const type = data.type || 'income';
  const category = data.category || 'Penjualan';
  const transactionDate = data.transactionDate || new Date().toISOString().split('T')[0];

  const [created] = await getDb()
    .insert(schema.cashbook)
    .values({
      user_id: userId,
      title: data.title,
      amount: data.amount,
      type,
      category,
      notes: data.notes || '',
      transaction_date: transactionDate,
    })
    .returning({ id: schema.cashbook.id });

  return {
    id: created.id,
    user_id: userId,
    title: data.title,
    amount: data.amount,
    type,
    category,
    notes: data.notes || '',
    transaction_date: transactionDate,
    created_at: new Date().toISOString(),
  };
}

export async function deleteCashbookEntry(id: number, userId: number): Promise<boolean> {
  const rows = await getDb()
    .delete(schema.cashbook)
    .where(and(eq(schema.cashbook.id, id), eq(schema.cashbook.user_id, userId)))
    .returning({ id: schema.cashbook.id });
  return rows.length > 0;
}
