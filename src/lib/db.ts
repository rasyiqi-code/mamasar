import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { formatPhoneForWhatsApp, slugify } from './utils';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mamasar.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS umkm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure migration for views & is_sold_out if table already existed
try {
  db.exec('ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 50;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN is_sold_out INTEGER DEFAULT 0;');
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
  created_at: string;
}

export function getArticles(): Article[] {
  return db.prepare('SELECT * FROM articles ORDER BY id ASC').all() as Article[];
}

export interface Zone {
  id: number;
  name: string;
  slug: string;
}

export interface UMKM {
  id: number;
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
    query += ` ORDER BY p.id DESC`;
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
}) {
  const cleanPhone = formatPhoneForWhatsApp(data.phone);
  const uniqueSlug = `${slugify(data.productName)}-${Date.now().toString(36)}`;

  const insertUMKM = db.prepare(
    'INSERT INTO umkm (name, phone, zone_id, is_verified, address) VALUES (?, ?, ?, 1, ?)'
  );
  const umkmResult = insertUMKM.run(data.umkmName, cleanPhone, data.zoneId, data.address || '');

  const insertProduct = db.prepare(`
    INSERT INTO products (umkm_id, name, slug, price, category, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const productResult = insertProduct.run(
    Number(umkmResult.lastInsertRowid),
    data.productName,
    uniqueSlug,
    data.price,
    data.category,
    data.imageUrl,
    data.description || `${data.productName} dari ${data.umkmName}, Sumenep.`
  );

  return {
    productId: Number(productResult.lastInsertRowid),
    slug: uniqueSlug,
  };
}

export default db;
