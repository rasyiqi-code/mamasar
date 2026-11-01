import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default data if zones is empty
const zoneCount = db.prepare('SELECT count(*) as count FROM zones').get() as { count: number };

if (zoneCount.count === 0) {
  const insertZone = db.prepare('INSERT INTO zones (name, slug) VALUES (?, ?)');
  const zones = [
    { name: 'MWC Kota Sumenep', slug: 'mwc-kota-sumenep' },
    { name: 'MWC Gapura', slug: 'mwc-gapura' },
    { name: 'MWC Kalianget', slug: 'mwc-kalianget' },
    { name: 'MWC Ambunten', slug: 'mwc-ambunten' },
    { name: 'MWC Batang-Batang', slug: 'mwc-batang-batang' },
    { name: 'MWC Manding', slug: 'mwc-manding' },
    { name: 'MWC Dungkek', slug: 'mwc-dungkek' },
    { name: 'MWC Saronggi', slug: 'mwc-saronggi' },
    { name: 'MWC Lenteng', slug: 'mwc-lenteng' },
    { name: 'MWC Bluto', slug: 'mwc-bluto' },
    { name: 'MWC Pragaan', slug: 'mwc-pragaan' },
  ];

  for (const z of zones) {
    insertZone.run(z.name, z.slug);
  }

  // Seed initial UMKM
  const insertUMKM = db.prepare(
    'INSERT INTO umkm (name, phone, zone_id, is_verified, address) VALUES (?, ?, ?, ?, ?)'
  );
  const umkm1 = insertUMKM.run('UD Barokah Jaya', '6281234567890', 2, 1, 'Dusun Karang Anyar, Gapura');
  const umkm2 = insertUMKM.run('Batik Madura Canteng', '6287812345678', 1, 1, 'Jl. Trunojoyo, Kota Sumenep');
  const umkm3 = insertUMKM.run('Dapur Bu Fatimah', '6285298765432', 3, 1, 'Desa Marengan, Kalianget');
  const umkm4 = insertUMKM.run('Camilan Kang Hasan', '6282334455667', 4, 1, 'Dusun Pandan, Ambunten');

  // Seed sample products
  const insertProduct = db.prepare(
    'INSERT INTO products (umkm_id, name, slug, price, category, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  insertProduct.run(
    Number(umkm1.lastInsertRowid),
    'Rengginang Lorjuk Super Asli Gapura',
    'rengginang-lorjuk-super-asli-gapura',
    25000,
    'Makanan & Minuman',
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    'Rengginang lorjuk khas Gapura Sumenep dengan taburan lorjuk melimpah dan rempah gurih asli. Renyah, tanpa pengawet buatan, cocok untuk camilan keluarga dan oleh-oleh khas Madura.'
  );

  insertProduct.run(
    Number(umkm2.lastInsertRowid),
    'Kain Batik Tulis Madura Corak Sekar Jagad',
    'kain-batik-tulis-madura-corak-sekar-jagad',
    185000,
    'Batik & Kerajinan',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    'Batik tulis asli pengrajin nahdliyin Sumenep. Menggunakan pewarna berkualitas dengan motif klasik Sumenep yang elegan, kain katun primissima dingin dan nyaman dipakai.'
  );

  insertProduct.run(
    Number(umkm3.lastInsertRowid),
    'Petis Ikan Cakalang Khas Kalianget',
    'petis-ikan-cakalang-khas-kalianget',
    18000,
    'Hasil Laut & Olahan',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80',
    'Petis ikan cakalang murni tanpa campuran tepung berlebih. Rasa gurih alami sangat cocok untuk rujak Madura, cocolan tahu, krupuk, dan bumbu dapur khas.'
  );

  insertProduct.run(
    Number(umkm4.lastInsertRowid),
    'Kripik Singkong Balado Bawang Renyah 250g',
    'kripik-singkong-balado-bawang-renyah',
    15000,
    'Makanan & Minuman',
    'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
    'Camilan kripik singkong gurih khas pesisir Ambunten Sumenep, potongan tipis renyah dibumbui bawang dan cabai asli tanpa pewarna buatan.'
  );
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
  created_at: string;
}

export function getAllZones(): Zone[] {
  return db.prepare('SELECT * FROM zones ORDER BY name ASC').all() as Zone[];
}

export function getProducts(options?: { zoneSlug?: string; category?: string; search?: string }): Product[] {
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

  query += ` ORDER BY p.id DESC`;

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
  // Normalize phone to start with 62
  let cleanPhone = data.phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  // Create slug from product name + random suffix for uniqueness
  const baseSlug = data.productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

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
