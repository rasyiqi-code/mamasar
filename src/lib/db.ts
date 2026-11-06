import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { formatPhoneForWhatsApp, slugify } from './utils';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const baseDir = isServerless ? '/tmp' : process.cwd();
const dataDir = path.resolve(baseDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mamasar.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'umkm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS umkm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    is_verified INTEGER DEFAULT 1,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    umkm_id INTEGER NOT NULL REFERENCES umkm(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    views INTEGER DEFAULT 50,
    is_sold_out INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    bumped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    shopee_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    organizer TEXT NOT NULL,
    event_date DATETIME NOT NULL,
    time_description TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location_address TEXT,
    estimated_attendance INTEGER DEFAULT 0,
    consumption_needed TEXT,
    allow_stalls INTEGER DEFAULT 1,
    coordinator_name TEXT,
    coordinator_phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Buku Kas Penjualan Santri (Slide 4 LPNU)
  CREATE TABLE IF NOT EXISTS cashbook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'income',
    category TEXT DEFAULT 'Penjualan',
    notes TEXT,
    transaction_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure migration for views & is_sold_out & bumped_at & user_id if table already existed
try {
  db.exec('ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 50;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN is_sold_out INTEGER DEFAULT 0;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN bumped_at DATETIME;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN shopee_url TEXT;');
} catch (_) {}
try {
  db.exec('ALTER TABLE umkm ADD COLUMN user_id INTEGER REFERENCES users(id);');
} catch (_) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN content TEXT;');
} catch (_) {}

// Import and run seed if tables are empty
import { seedDatabase } from './seeds';

const zoneCount = db.prepare('SELECT count(*) as count FROM zones').get() as { count: number };
const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };

if (zoneCount.count === 0 || productCount.count === 0) {
  seedDatabase(db);
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

export function getArticles(): Article[] {
  return db.prepare('SELECT * FROM articles ORDER BY id ASC').all() as Article[];
}

export function getArticleBySlug(slug: string): Article | undefined {
  return db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug) as Article | undefined;
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

export function getEvents(options?: { zoneSlug?: string }): EventItem[] {
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
  return db.prepare(query).all(...params) as EventItem[];
}

export function getEventBySlug(slug: string): EventItem | undefined {
  const query = `
    SELECT e.*, z.name as zone_name, z.slug as zone_slug
    FROM events e
    JOIN zones z ON e.zone_id = z.id
    WHERE e.slug = ?
  `;
  return db.prepare(query).get(slug) as EventItem | undefined;
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

export function getAllZones(): (Zone & { count?: number })[] {
  const zones = db.prepare('SELECT * FROM zones ORDER BY name ASC').all() as Zone[];
  const counts = db.prepare(`
    SELECT u.zone_id, count(p.id) as count 
    FROM products p 
    JOIN umkm u ON p.umkm_id = u.id 
    GROUP BY u.zone_id
  `).all() as { zone_id: number; count: number }[];

  const countMap = new Map(counts.map(c => [c.zone_id, c.count]));

  return zones.map(z => ({
    ...z,
    count: countMap.get(z.id) || 0
  }));
}

export function getAllUMKM(options?: {
  zoneSlug?: string;
  search?: string;
}): (UMKM & { product_count: number; zone_slug: string; sample_images: string[] })[] {
  let query = `
    SELECT 
      u.*, 
      z.name as zone_name,
      z.slug as zone_slug,
      count(p.id) as product_count,
      GROUP_CONCAT(p.image_url) as sample_images_str
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
    query += ` AND (u.name LIKE ? OR u.address LIKE ? OR z.name LIKE ?)`;
    const searchParam = `%${options.search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ` GROUP BY u.id ORDER BY product_count DESC, u.id ASC`;

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((r) => ({
    ...r,
    sample_images: r.sample_images_str ? r.sample_images_str.split(',').filter(Boolean) : [],
  }));
}

export function getUMKMById(id: number | string): (UMKM & {
  zone_name: string;
  zone_slug: string;
  product_count: number;
  products: Product[];
}) | undefined {
  const numId = Number(id);
  if (isNaN(numId)) return undefined;

  const umkm = db.prepare(`
    SELECT 
      u.*,
      z.name as zone_name,
      z.slug as zone_slug,
      count(p.id) as product_count
    FROM umkm u
    JOIN zones z ON u.zone_id = z.id
    LEFT JOIN products p ON p.umkm_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
  `).get(numId) as any;

  if (!umkm) return undefined;

  const products = db.prepare(`
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
  `).all(numId) as Product[];

  return {
    ...umkm,
    products,
  };
}

export function getProducts(options?: {
  zoneSlug?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}): Product[] {
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
    query += ` AND (p.name LIKE ? OR p.description LIKE ? OR u.name LIKE ?)`;
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

  return db.prepare(query).all(...params) as Product[];
}

export function getProductBySlug(slug: string): Product | undefined {
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
  return db.prepare(query).get(slug) as Product | undefined;
}

export function createUMKMAndProduct(data: {
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
}) {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  const insertUMKM = db.prepare(
    'INSERT INTO umkm (name, phone, zone_id, is_verified, address) VALUES (?, ?, ?, 1, ?)'
  );
  const umkmResult = insertUMKM.run(data.umkmName, cleanPhone, data.zoneId, data.address || '');

  const insertProduct = db.prepare(`
    INSERT INTO products (umkm_id, name, slug, price, category, image_url, description, shopee_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productResult = insertProduct.run(
    Number(umkmResult.lastInsertRowid),
    data.productName,
    uniqueSlug,
    data.price,
    data.category,
    data.imageUrl,
    data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`,
    data.shopeeUrl || null
  );

  return {
    productId: Number(productResult.lastInsertRowid),
    slug: uniqueSlug,
  };
}

/**
 * Increment view count for a product
 */
export function incrementProductViews(slug: string): void {
  try {
    db.prepare('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE slug = ?').run(slug);
  } catch (err) {
    console.error('Error incrementing views:', err);
  }
}

/**
 * Bump / Naikkan produk to the top of catalog listings
 */
export function bumpProduct(productId: number, umkmId?: number): boolean {
  let query = 'UPDATE products SET bumped_at = CURRENT_TIMESTAMP WHERE id = ?';
  const params: any[] = [productId];

  if (umkmId) {
    query += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  const result = db.prepare(query).run(...params);
  return result.changes > 0;
}

/**
 * Toggle product stock status (Available vs Sold Out)
 */
export function toggleProductStock(productId: number, umkmId?: number): { success: boolean; is_sold_out?: number } {
  let findQuery = 'SELECT is_sold_out FROM products WHERE id = ?';
  const params: any[] = [productId];
  if (umkmId) {
    findQuery += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  const current = db.prepare(findQuery).get(...params) as { is_sold_out: number } | undefined;
  if (!current) return { success: false };

  const newStatus = current.is_sold_out === 1 ? 0 : 1;
  let updateQuery = 'UPDATE products SET is_sold_out = ? WHERE id = ?';
  const updateParams: any[] = [newStatus, productId];
  if (umkmId) {
    updateQuery += ' AND umkm_id = ?';
    updateParams.push(umkmId);
  }

  const result = db.prepare(updateQuery).run(...updateParams);
  return { success: result.changes > 0, is_sold_out: newStatus };
}

/**
 * Delete product from catalog
 */
export function deleteProduct(productId: number, umkmId?: number): boolean {
  let query = 'DELETE FROM products WHERE id = ?';
  const params: any[] = [productId];
  if (umkmId) {
    query += ' AND umkm_id = ?';
    params.push(umkmId);
  }

  const result = db.prepare(query).run(...params);
  return result.changes > 0;
}

/**
 * Find or create user via Google OAuth profile
 */
export function findOrCreateUserByGoogle(data: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): User {
  const existing = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(data.googleId, data.email) as User | undefined;
  if (existing) {
    // Update name / avatar if changed
    db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(data.name, data.avatarUrl || existing.avatar_url, existing.id);
    return { ...existing, name: data.name, avatar_url: data.avatarUrl || existing.avatar_url };
  }

  const res = db.prepare(`
    INSERT INTO users (google_id, email, name, avatar_url, role)
    VALUES (?, ?, ?, ?, 'umkm')
  `).run(data.googleId, data.email, data.name, data.avatarUrl || '');

  return {
    id: Number(res.lastInsertRowid),
    google_id: data.googleId,
    email: data.email,
    name: data.name,
    avatar_url: data.avatarUrl,
    role: 'umkm',
    created_at: new Date().toISOString(),
  };
}

export function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }): void {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!existing) return;
  db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(
    data.name || existing.name,
    data.avatarUrl || existing.avatar_url,
    userId
  );
}

/**
 * Create a secure session token for user
 */
export function createSession(userId: number): string {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  // 30 days expiration
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt);
  return sessionId;
}

/**
 * Get user and their UMKM store from session token
 */
export function getUserFromSession(sessionId: string): (User & { umkm?: UMKM & { zone_name: string; zone_slug: string } }) | null {
  if (!sessionId) return null;

  const row = db.prepare(`
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
  `).get(sessionId) as any;

  if (!row) return null;

  // Check expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(sessionId);
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
export function deleteSession(sessionId: string): void {
  try {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  } catch (_) {}
}

/**
 * Get UMKM store owned by a user
 */
export function getUMKMByUserId(userId: number): (UMKM & { zone_name: string; zone_slug: string; products: Product[] }) | undefined {
  const store = db.prepare(`
    SELECT m.*, z.name as zone_name, z.slug as zone_slug
    FROM umkm m
    JOIN zones z ON m.zone_id = z.id
    WHERE m.user_id = ?
  `).get(userId) as any;

  if (!store) return undefined;

  const products = db.prepare(`
    SELECT p.*, m.name as umkm_name, m.phone as umkm_phone, m.address as umkm_address, m.is_verified, z.name as zone_name, z.slug as zone_slug
    FROM products p
    JOIN umkm m ON p.umkm_id = m.id
    JOIN zones z ON m.zone_id = z.id
    WHERE p.umkm_id = ?
    ORDER BY COALESCE(p.bumped_at, p.created_at) DESC, p.id DESC
  `).all(store.id) as Product[];

  return {
    ...store,
    products,
  };
}

/**
 * Create UMKM store profile linked to an authenticated user
 */
export function createUMKMForUser(userId: number, data: {
  name: string;
  phone: string;
  zoneId: number;
  address?: string;
}) {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);

  const existing = db.prepare('SELECT id FROM umkm WHERE user_id = ?').get(userId) as { id: number } | undefined;
  if (existing) {
    db.prepare('UPDATE umkm SET name = ?, phone = ?, zone_id = ?, address = ? WHERE id = ?')
      .run(data.name, cleanPhone, data.zoneId, data.address || '', existing.id);
    return existing.id;
  }

  const res = db.prepare(`
    INSERT INTO umkm (user_id, name, phone, zone_id, is_verified, address)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(userId, data.name, cleanPhone, data.zoneId, data.address || '');

  return Number(res.lastInsertRowid);
}

/**
 * Add product directly to an existing UMKM store
 */
export function addProductToUMKM(umkmId: number, data: {
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  description?: string;
  shopeeUrl?: string;
}) {
  const uniqueSlug = `${slugify(data.name)}-${Date.now().toString(36)}`;
  const store = db.prepare('SELECT name FROM umkm WHERE id = ?').get(umkmId) as { name: string } | undefined;
  const storeName = store ? store.name : 'UMKM NU';

  const res = db.prepare(`
    INSERT INTO products (umkm_id, name, slug, price, category, image_url, description, shopee_url, bumped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    umkmId,
    data.name,
    uniqueSlug,
    data.price,
    data.category,
    data.imageUrl,
    data.description || `${data.name} dari ${storeName}, Sumenep.`,
    data.shopeeUrl || null
  );

  return {
    productId: Number(res.lastInsertRowid),
    slug: uniqueSlug,
  };
}

/**
 * Mini Buku Kas Penjualan Santri (Slide 4 LPNU: Buku Kas Penjualan Santri)
 */
export function getCashbookEntries(userId: number, limit: number = 30): CashbookEntry[] {
  return db.prepare(`
    SELECT * FROM cashbook WHERE user_id = ? ORDER BY transaction_date DESC, id DESC LIMIT ?
  `).all(userId, limit) as CashbookEntry[];
}

export function getCashbookSummary(userId: number): { totalIncome: number; totalExpense: number; balance: number } {
  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM cashbook WHERE user_id = ?
  `).get(userId) as any;

  const totalIncome = Number(row?.total_income || 0);
  const totalExpense = Number(row?.total_expense || 0);
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export function addCashbookEntry(userId: number, data: {
  title: string;
  amount: number;
  type?: 'income' | 'expense';
  category?: string;
  notes?: string;
  transactionDate?: string;
}): CashbookEntry {
  const type = data.type || 'income';
  const category = data.category || 'Penjualan';
  const transactionDate = data.transactionDate || new Date().toISOString().split('T')[0];

  const res = db.prepare(`
    INSERT INTO cashbook (user_id, title, amount, type, category, notes, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, data.title, data.amount, type, category, data.notes || '', transactionDate);

  return {
    id: Number(res.lastInsertRowid),
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

export function deleteCashbookEntry(id: number, userId: number): boolean {
  const res = db.prepare('DELETE FROM cashbook WHERE id = ? AND user_id = ?').run(id, userId);
  return res.changes > 0;
}

export default db;
