import { getNeonSql } from './neon';
import { formatPhoneForWhatsApp, slugify } from './utils';

/**
 * Data layer for Neon PostgreSQL.
 *
 * All functions are async: queries run over the Neon serverless HTTP driver
 * instead of a local SQLite file, so state survives across serverless
 * instances (Vercel) and is shared by every request.
 *
 * The query helpers below accept SQLite-style `?` placeholders and convert
 * them to Postgres `$n` placeholders, keeping the SQL close to the original
 * SQLite implementation.
 */

type NeonSql = ReturnType<typeof getNeonSql>;

let sqlClient: NeonSql | null = null;

function getSql(): NeonSql {
  // Lazy init so importing this module never crashes environments without
  // DATABASE_URL (build time, unit tests); the error surfaces on first query.
  if (!sqlClient) {
    sqlClient = getNeonSql();
  }
  return sqlClient;
}

function toPgPlaceholders(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

/**
 * neon() returns TIMESTAMP WITH TIME ZONE columns as JS Date objects.
 * Normalize them to ISO strings so row shapes stay identical to the previous
 * SQLite layer (interfaces declare created_at / event_date as string).
 */
function normalizeRow<T>(row: any): T {
  if (row && typeof row === 'object') {
    for (const key of Object.keys(row)) {
      if (row[key] instanceof Date) {
        row[key] = row[key].toISOString();
      }
    }
  }
  return row as T;
}

async function all<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const rows = await getSql().query(toPgPlaceholders(text), params);
  return rows.map(normalizeRow) as T[];
}

async function one<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
  const rows = await all<T>(text, params);
  return rows[0];
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

export async function getArticles(): Promise<Article[]> {
  return all<Article>('SELECT * FROM articles ORDER BY id ASC');
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  return one<Article>('SELECT * FROM articles WHERE slug = ?', [slug]);
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

export async function getEvents(options?: { zoneSlug?: string }): Promise<EventItem[]> {
  let query = `
    SELECT e.*, z.name as zone_name, z.slug as zone_slug
    FROM events e
    JOIN zones z ON e.zone_id = z.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    query += ' AND z.slug = ?';
    params.push(options.zoneSlug);
  }

  query += ' ORDER BY e.event_date ASC, e.id ASC';
  return all<EventItem>(query, params);
}

export async function getEventBySlug(slug: string): Promise<EventItem | undefined> {
  const query = `
    SELECT e.*, z.name as zone_name, z.slug as zone_slug
    FROM events e
    JOIN zones z ON e.zone_id = z.id
    WHERE e.slug = ?
  `;
  return one<EventItem>(query, [slug]);
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  created_at: string;
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
  is_featured?: number;
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

export async function getAllZones(): Promise<(Zone & { count?: number })[]> {
  const zones = await all<Zone>('SELECT * FROM zones ORDER BY name ASC');
  const counts = await all<{ zone_id: number; count: number }>(`
    SELECT u.zone_id, count(p.id)::int as count
    FROM products p
    JOIN umkm u ON p.umkm_id = u.id
    GROUP BY u.zone_id
  `);

  const countMap = new Map(counts.map((c) => [c.zone_id, c.count]));

  return zones.map((z) => ({
    ...z,
    count: countMap.get(z.id) || 0,
  }));
}

export async function getAllUMKM(options?: {
  zoneSlug?: string;
  search?: string;
}): Promise<(UMKM & { product_count: number; zone_slug: string; sample_images: string[] })[]> {
  let query = `
    SELECT
      u.*,
      z.name as zone_name,
      z.slug as zone_slug,
      count(p.id)::int as product_count,
      string_agg(p.image_url, ',') as sample_images_str
    FROM umkm u
    JOIN zones z ON u.zone_id = z.id
    LEFT JOIN products p ON p.umkm_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    query += ` AND z.slug = ?`;
    params.push(options.zoneSlug);
  }

  if (options?.search && options.search.trim() !== '') {
    // ILIKE keeps the previous SQLite behavior where LIKE was case-insensitive.
    query += ` AND (u.name ILIKE ? OR u.address ILIKE ? OR z.name ILIKE ?)`;
    const searchParam = `%${options.search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ` GROUP BY u.id, z.name, z.slug ORDER BY product_count DESC, u.id ASC`;

  const rows = await all<any>(query, params);

  return rows.map((r) => ({
    ...r,
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

  const umkm = await one<any>(`
    SELECT
      u.*,
      z.name as zone_name,
      z.slug as zone_slug,
      count(p.id)::int as product_count
    FROM umkm u
    JOIN zones z ON u.zone_id = z.id
    LEFT JOIN products p ON p.umkm_id = u.id
    WHERE u.id = ?
    GROUP BY u.id, z.name, z.slug
  `, [numId]);

  if (!umkm) return undefined;

  const products = await all<Product>(`
    SELECT
      p.*,
      u.name as umkm_name,
      u.phone as umkm_phone,
      u.address as umkm_address,
      u.is_verified as is_verified,
      z.name as zone_name,
      z.slug as zone_slug
    FROM products p
    JOIN umkm u ON p.umkm_id = u.id
    JOIN zones z ON u.zone_id = z.id
    WHERE p.umkm_id = ?
    ORDER BY p.id DESC
  `, [numId]);

  return {
    ...umkm,
    products,
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
  let query = `
    SELECT
      p.*,
      u.name as umkm_name,
      u.phone as umkm_phone,
      u.address as umkm_address,
      u.is_verified as is_verified,
      z.name as zone_name,
      z.slug as zone_slug
    FROM products p
    JOIN umkm u ON p.umkm_id = u.id
    JOIN zones z ON u.zone_id = z.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.zoneSlug && options.zoneSlug !== 'semua') {
    query += ` AND z.slug = ?`;
    params.push(options.zoneSlug);
  }

  if (options?.category && options.category !== 'semua') {
    query += ` AND p.category = ?`;
    params.push(options.category);
  }

  if (options?.search && options.search.trim() !== '') {
    query += ` AND (p.name ILIKE ? OR p.description ILIKE ? OR u.name ILIKE ?)`;
    const searchParam = `%${options.search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (options?.minPrice && options.minPrice > 0) {
    query += ` AND p.price >= ?`;
    params.push(options.minPrice);
  }

  if (options?.maxPrice && options.maxPrice > 0) {
    query += ` AND p.price <= ?`;
    params.push(options.maxPrice);
  }

  if (options?.sort === 'price_asc') {
    query += ` ORDER BY p.price ASC, p.id DESC`;
  } else if (options?.sort === 'price_desc') {
    query += ` ORDER BY p.price DESC, p.id DESC`;
  } else {
    query += ` ORDER BY COALESCE(p.bumped_at, p.created_at) DESC, p.id DESC`;
  }

  return all<Product>(query, params);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const query = `
    SELECT
      p.*,
      u.name as umkm_name,
      u.phone as umkm_phone,
      u.address as umkm_address,
      u.is_verified as is_verified,
      z.name as zone_name,
      z.slug as zone_slug
    FROM products p
    JOIN umkm u ON p.umkm_id = u.id
    JOIN zones z ON u.zone_id = z.id
    WHERE p.slug = ?
  `;
  return one<Product>(query, [slug]);
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
}): Promise<{ productId: number; slug: string }> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  const umkmRows = await getSql().query(
    toPgPlaceholders('INSERT INTO umkm (name, phone, zone_id, is_verified, address) VALUES (?, ?, ?, 1, ?) RETURNING id'),
    [data.umkmName, cleanPhone, data.zoneId, data.address || '']
  );
  const umkmId = (umkmRows[0] as any).id;

  const productRows = await getSql().query(
    toPgPlaceholders(`
      INSERT INTO products (umkm_id, name, slug, price, category, image_url, description, shopee_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `),
    [
      umkmId,
      data.productName,
      uniqueSlug,
      data.price,
      data.category,
      data.imageUrl,
      data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`,
      data.shopeeUrl || null,
    ]
  );

  return {
    productId: Number((productRows[0] as any).id),
    slug: uniqueSlug,
  };
}

/**
 * Increment view count for a product
 */
export async function incrementProductViews(slug: string): Promise<{ success: boolean }> {
  try {
    const rows = await getSql().query(
      toPgPlaceholders('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE slug = ? RETURNING id'),
      [slug]
    );
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
  let query = 'UPDATE products SET bumped_at = CURRENT_TIMESTAMP WHERE id = ?';
  const params: any[] = [productId];

  if (umkmId) {
    query += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  query += ' RETURNING id';
  const rows = await getSql().query(toPgPlaceholders(query), params);
  return rows.length > 0;
}

/**
 * Toggle product stock status (Available vs Sold Out).
 * Single atomic UPDATE, so concurrent toggles cannot overwrite each other.
 */
export async function toggleProductStock(productId: number, umkmId?: number): Promise<{ success: boolean; is_sold_out: number }> {
  let query = 'UPDATE products SET is_sold_out = CASE WHEN is_sold_out = 1 THEN 0 ELSE 1 END WHERE id = ?';
  const params: any[] = [productId];

  if (umkmId) {
    query += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  query += ' RETURNING is_sold_out';

  const rows = await getSql().query(toPgPlaceholders(query), params);
  if (rows.length === 0) return { success: false, is_sold_out: 0 };

  return { success: true, is_sold_out: Number((rows[0] as any).is_sold_out) };
}

/**
 * Delete product from catalog
 */
export async function deleteProduct(productId: number, umkmId?: number): Promise<boolean> {
  let query = 'DELETE FROM products WHERE id = ?';
  const params: any[] = [productId];

  if (umkmId) {
    query += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  query += ' RETURNING id';
  const rows = await getSql().query(toPgPlaceholders(query), params);
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
  const existingByGoogle = await one<User>('SELECT * FROM users WHERE google_id = ?', [data.googleId]);
  if (existingByGoogle) {
    const nextName = data.name || existingByGoogle.name;
    const nextAvatar = data.avatarUrl || existingByGoogle.avatar_url;
    if (nextName !== existingByGoogle.name || nextAvatar !== existingByGoogle.avatar_url) {
      await getSql().query(
        toPgPlaceholders('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?'),
        [nextName, nextAvatar, existingByGoogle.id]
      );
    }
    return { ...existingByGoogle, name: nextName, avatar_url: nextAvatar };
  }

  // Only check email if no google_id match found
  const existingByEmail = await one<User>('SELECT * FROM users WHERE email = ?', [data.email]);
  if (existingByEmail) {
    const nextName = data.name || existingByEmail.name;
    const nextAvatar = data.avatarUrl || existingByEmail.avatar_url;
    if (nextName !== existingByEmail.name || nextAvatar !== existingByEmail.avatar_url) {
      await getSql().query(
        toPgPlaceholders('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?'),
        [nextName, nextAvatar, existingByEmail.id]
      );
    }
    return { ...existingByEmail, name: nextName, avatar_url: nextAvatar };
  }

  // Create new user
  const rows = await getSql().query(
    toPgPlaceholders(`
      INSERT INTO users (google_id, email, name, avatar_url, role)
      VALUES (?, ?, ?, ?, 'umkm')
      RETURNING id
    `),
    [data.googleId, data.email, data.name, data.avatarUrl || '']
  );

  return {
    id: Number((rows[0] as any).id),
    google_id: data.googleId,
    email: data.email,
    name: data.name,
    avatar_url: data.avatarUrl,
    role: 'umkm',
    created_at: new Date().toISOString(),
  };
}

export async function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }): Promise<void> {
  const existing = await one<User>('SELECT * FROM users WHERE id = ?', [userId]);
  if (!existing) return;
  await getSql().query(
    toPgPlaceholders('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?'),
    [data.name || existing.name, data.avatarUrl || existing.avatar_url, userId]
  );
}

/**
 * Create a secure session token for user
 */
export async function createSession(userId: number): Promise<string> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  // 30 days expiration
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await getSql().query(
    toPgPlaceholders('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'),
    [sessionId, userId, expiresAt]
  );

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
  const existing = await one<{ id: string }>(
    'SELECT id FROM sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY expires_at DESC LIMIT 1',
    [userId]
  );
  if (existing) return existing.id;
  return createSession(userId);
}

/**
 * Delete sessions that are past their expiration date.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const rows = await getSql().query(
    'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP RETURNING id'
  );
  return rows.length;
}

/**
 * Get user and their UMKM store from session token
 */
export async function getUserFromSession(sessionId: string): Promise<(User & { umkm?: UMKM & { zone_name: string; zone_slug: string } }) | null> {
  if (!sessionId) return null;

  const row = await one<any>(`
    SELECT
      u.*,
      s.expires_at,
      m.id as umkm_id,
      m.name as umkm_name,
      m.phone as umkm_phone,
      m.zone_id as umkm_zone_id,
      m.is_verified as umkm_is_verified,
      m.address as umkm_address,
      z.name as zone_name,
      z.slug as zone_slug
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN umkm m ON m.user_id = u.id
    LEFT JOIN zones z ON m.zone_id = z.id
    WHERE s.id = ?
  `, [sessionId]);

  if (!row) return null;

  // Check expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  const user: User & { umkm?: any } = {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    role: row.role,
    created_at: row.created_at,
  };

  if (row.umkm_id) {
    user.umkm = {
      id: row.umkm_id,
      user_id: row.id,
      name: row.umkm_name,
      phone: row.umkm_phone,
      zone_id: row.umkm_zone_id,
      zone_name: row.zone_name,
      zone_slug: row.zone_slug,
      is_verified: row.umkm_is_verified,
      address: row.umkm_address,
    };
  }

  return user;
}

/**
 * Delete a session on logout
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await getSql().query(toPgPlaceholders('DELETE FROM sessions WHERE id = ?'), [sessionId]);
  } catch (_) {}
}

/**
 * Get UMKM store owned by a user
 */
export async function getUMKMByUserId(userId: number): Promise<(UMKM & { zone_name: string; zone_slug: string; products: Product[] }) | undefined> {
  const store = await one<any>(`
    SELECT m.*, z.name as zone_name, z.slug as zone_slug
    FROM umkm m
    JOIN zones z ON m.zone_id = z.id
    WHERE m.user_id = ?
  `, [userId]);

  if (!store) return undefined;

  const products = await all<Product>(`
    SELECT p.*, m.name as umkm_name, m.phone as umkm_phone, m.address as umkm_address, m.is_verified, z.name as zone_name, z.slug as zone_slug
    FROM products p
    JOIN umkm m ON p.umkm_id = m.id
    JOIN zones z ON m.zone_id = z.id
    WHERE p.umkm_id = ?
    ORDER BY COALESCE(p.bumped_at, p.created_at) DESC, p.id DESC
  `, [store.id]);

  return {
    ...store,
    products,
  };
}

/**
 * Create UMKM store profile linked to an authenticated user
 */
export async function createUMKMForUser(userId: number, data: {
  name: string;
  phone: string;
  zoneId: number;
  address?: string;
}): Promise<number> {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  const existing = await one<{ id: number }>('SELECT id FROM umkm WHERE user_id = ?', [userId]);
  if (existing) {
    await getSql().query(
      toPgPlaceholders('UPDATE umkm SET name = ?, phone = ?, zone_id = ?, address = ? WHERE id = ?'),
      [data.name, cleanPhone, data.zoneId, data.address || '', existing.id]
    );
    return existing.id;
  }

  const rows = await getSql().query(
    toPgPlaceholders(`
      INSERT INTO umkm (user_id, name, phone, zone_id, is_verified, address)
      VALUES (?, ?, ?, ?, 1, ?)
      RETURNING id
    `),
    [userId, data.name, cleanPhone, data.zoneId, data.address || '']
  );

  return Number((rows[0] as any).id);
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
  const store = await one<{ name: string }>('SELECT name FROM umkm WHERE id = ?', [umkmId]);
  const storeName = store ? store.name : 'UMKM NU';

  const rows = await getSql().query(
    toPgPlaceholders(`
      INSERT INTO products (umkm_id, name, slug, price, category, image_url, description, shopee_url, bumped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id
    `),
    [
      umkmId,
      data.name,
      uniqueSlug,
      data.price,
      data.category,
      data.imageUrl,
      data.description || `${data.name} dari ${storeName}, Sumenep.`,
      data.shopeeUrl || null,
    ]
  );

  return {
    productId: Number((rows[0] as any).id),
    slug: uniqueSlug,
  };
}

/**
 * Mini Buku Kas Penjualan Santri (Slide 4 LPNU: Buku Kas Penjualan Santri)
 */
export async function getCashbookEntries(userId: number, limit: number = 30): Promise<CashbookEntry[]> {
  return all<CashbookEntry>(`
    SELECT * FROM cashbook WHERE user_id = ? ORDER BY transaction_date DESC, id DESC LIMIT ?
  `, [userId, limit]);
}

export async function getCashbookSummary(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const row = await one<any>(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM cashbook WHERE user_id = ?
  `, [userId]);

  const totalIncome = Number(row?.total_income || 0);
  const totalExpense = Number(row?.total_expense || 0);
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

  const rows = await getSql().query(
    toPgPlaceholders(`
      INSERT INTO cashbook (user_id, title, amount, type, category, notes, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `),
    [userId, data.title, data.amount, type, category, data.notes || '', transactionDate]
  );

  return {
    id: Number((rows[0] as any).id),
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
  const rows = await getSql().query(
    toPgPlaceholders('DELETE FROM cashbook WHERE id = ? AND user_id = ? RETURNING id'),
    [id, userId]
  );
  return rows.length > 0;
}
