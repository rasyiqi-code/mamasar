import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(rootDir, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mamasar.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Ensure schema
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
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Import seed definitions
const { seedDatabase } = await import('../src/lib/seeds.js').catch(async () => {
  // If running directly with tsx or transpiled, or fall back to seeds.ts
  return await import('../src/lib/seeds.ts');
});

const isReset = process.argv.includes('--reset') || process.argv.includes('--force');

console.log(`\n🌱 Memulai seeding data Pasar Warga NU Sumenep... (mode: ${isReset ? 'RESET & RE-SEED' : 'SEED IF MISSING'})`);

seedDatabase(db, { force: isReset });

const zoneCount = db.prepare('SELECT count(*) as count FROM zones').get();
const umkmCount = db.prepare('SELECT count(*) as count FROM umkm').get();
const productCount = db.prepare('SELECT count(*) as count FROM products').get();
const articleCount = db.prepare('SELECT count(*) as count FROM articles').get();

console.log(`\n✅ Database berhasil di-seed!`);
console.log(`   📍 Wilayah MWC  : ${zoneCount.count} zona`);
console.log(`   🏪 Toko UMKM    : ${umkmCount.count} toko terverifikasi`);
console.log(`   📦 Iklan Produk : ${productCount.count} produk aktif`);
console.log(`   📰 Artikel/Info : ${articleCount.count} panduan warga\n`);

db.close();
