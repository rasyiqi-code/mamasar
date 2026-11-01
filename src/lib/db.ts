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
`);

// Ensure migration for views & is_sold_out if table already existed
try {
  db.exec('ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 50;');
} catch (_) {}
try {
  db.exec('ALTER TABLE products ADD COLUMN is_sold_out INTEGER DEFAULT 0;');
} catch (_) {}

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

// Check if we need to seed additional products to reach full classified catalog (12 products)
const currentProdCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
if (currentProdCount.count < 12) {
  const insertUMKM = db.prepare(
    'INSERT INTO umkm (name, phone, zone_id, is_verified, address) VALUES (?, ?, ?, ?, ?)'
  );
  const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (umkm_id, name, slug, price, category, image_url, description, views, is_sold_out) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const u5 = insertUMKM.run('Sentra Nira Dungkek', '6281987654321', 7, 1, 'Desa Lapa Laok, Dungkek');
  const u6 = insertUMKM.run('Barokah Rebon Saronggi', '6282123459876', 8, 1, 'Desa Tanjung, Saronggi');
  const u7 = insertUMKM.run('Krupuk Sari Laut', '6285333444555', 5, 1, 'Desa Lombang, Batang-Batang');
  const u8 = insertUMKM.run('Madu Rimba Manding', '6287711223344', 6, 1, 'Desa Manding Laok, Manding');
  const u9 = insertUMKM.run('Jamu Warisan Lenteng', '6282333777888', 9, 1, 'Desa Lenteng Barat, Lenteng');
  const u10 = insertUMKM.run('Pengrajin Lontar Pragaan', '6281333999111', 11, 1, 'Desa Prenduan, Pragaan');
  const u11 = insertUMKM.run('Toko Santri Mandiri', '6287888999000', 1, 1, 'Jl. KH. Agus Salim, Kota Sumenep');
  const u12 = insertUMKM.run('Camilan Barokah Bluto', '6285222333444', 10, 1, 'Desa Aengbaja Raja, Bluto');

  insertProduct.run(
    Number(u5.lastInsertRowid),
    'Gula Merah Siwalan Murni Dungkek',
    'gula-merah-siwalan-murni-dungkek',
    22000,
    'Pertanian & Perkebunan',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    'Gula merah cetak alami asli dari nira pohon siwalan segar Dungkek Sumenep. Manis legit alami tanpa bahan pengawet.',
    342,
    0
  );

  insertProduct.run(
    Number(u6.lastInsertRowid),
    'Terasi Udang Rebon Asli Pesisir Saronggi',
    'terasi-udang-rebon-asli-pesisir-saronggi',
    14000,
    'Hasil Laut & Olahan',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    'Terasi rebon asli nelayan Saronggi kualitas pilihan, wangi gurih sedap untuk sambal terasi mentah khas Madura.',
    528,
    0
  );

  insertProduct.run(
    Number(u7.lastInsertRowid),
    'Kerupuk Ikan Tongkol Gurih Renyah 500g',
    'kerupuk-ikan-tongkol-gurih-renyah-500g',
    20000,
    'Hasil Laut & Olahan',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    'Kerupuk ikan tongkol segar racikan warga nahdliyin Batang-Batang. Ikan terasa pekat, mekar renyah gurih.',
    412,
    0
  );

  insertProduct.run(
    Number(u8.lastInsertRowid),
    'Madu Hutan Liar Asli Madura 350ml',
    'madu-hutan-liar-asli-madura-350ml',
    75000,
    'Herbal & Jamu',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    'Madu murni hasil panen lebah liar perbukitan Manding. Murni tanpa campuran gula, bagus untuk daya tahan tubuh.',
    675,
    0
  );

  insertProduct.run(
    Number(u9.lastInsertRowid),
    'Jamu Ramuan Tradisional Madura Sehat Alami',
    'jamu-ramuan-tradisional-madura-sehat-alami',
    35000,
    'Herbal & Jamu',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    'Ramuan herbal tradisional Madura olahan Fatayat NU Lenteng. Rempah alami temulawak, jahe merah, dan kunyit.',
    289,
    0
  );

  insertProduct.run(
    Number(u10.lastInsertRowid),
    'Tas Anyaman Daun Lontar Etnik Madura',
    'tas-anyaman-daun-lontar-etnik-madura',
    45000,
    'Batik & Kerajinan',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80',
    'Tas etnik ramah lingkungan dari anyaman daun lontar siwalan pilihan pengrajin Pragaan Sumenep. Kuat dan artistik.',
    198,
    0
  );

  insertProduct.run(
    Number(u11.lastInsertRowid),
    'Kopyah Santri Songkok Nasional Bordir NU',
    'kopyah-santri-songkok-nasional-bordir-nu',
    65000,
    'Fashion Muslim',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    'Songkok bludru premium berkualitas dengan bordir logo lambang NU halus dan presisi. Nyaman dipakai santri.',
    814,
    0
  );

  insertProduct.run(
    Number(u12.lastInsertRowid),
    'Keripik Pisang Madu Gurih Manis Bluto',
    'keripik-pisang-madu-gurih-manis-bluto',
    16000,
    'Makanan & Minuman',
    'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
    'Keripik pisang pilihan diiris tipis dengan balutan karamel madu asli khas Bluto Sumenep. Renyah gurih manis.',
    375,
    1
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

export function getAllUMKM(): (UMKM & { product_count: number })[] {
  return db.prepare(`
    SELECT 
      u.*, 
      z.name as zone_name,
      count(p.id) as product_count
    FROM umkm u
    JOIN zones z ON u.zone_id = z.id
    LEFT JOIN products p ON p.umkm_id = u.id
    GROUP BY u.id
    ORDER BY product_count DESC, u.id ASC
  `).all() as (UMKM & { product_count: number })[];
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
