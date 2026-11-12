import { neon } from '@neondatabase/serverless';
import { SEED_ZONES, SEED_UMKM, SEED_PRODUCTS, SEED_ARTICLES, SEED_EVENTS } from '../src/lib/seeds.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL tidak ditemukan di environment.');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log('🐘 Menghubungkan ke Neon PostgreSQL & membuat skema tabel...');

  await sql`
    CREATE TABLE IF NOT EXISTS zones (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      role VARCHAR(20) NOT NULL DEFAULT 'warga',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS umkm (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      is_verified INTEGER DEFAULT 1,
      address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      umkm_id INTEGER NOT NULL REFERENCES umkm(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      category VARCHAR(100) NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      views INTEGER DEFAULT 0,
      is_sold_out INTEGER DEFAULT 0,
      shopee_url TEXT,
      bumped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Kolom tambahan untuk database Neon yang sudah dibuat sebelumnya
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS shopee_url TEXT;`;
  await sql`ALTER TABLE products ALTER COLUMN views SET DEFAULT 0;`;
  // Kolom yang pernah dibuat tapi tidak pernah dipakai aplikasi
  await sql`ALTER TABLE products DROP COLUMN IF EXISTS gallery_images;`;
  await sql`ALTER TABLE products DROP COLUMN IF EXISTS is_featured;`;
  // 3 Core Roles RBAC: 'superadmin', 'petugas', 'warga' (kepemilikan toko berbasis relasi entitas umkm)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'warga';`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) NOT NULL DEFAULT 'none';`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone_id INTEGER REFERENCES zones(id);`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_org VARCHAR(255);`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(50);`;

  // Kolom tracking pembuat toko jemput bola & riwayat klaim
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;`;

  // Tabel Favorit Sinkron Database
  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_user_product UNIQUE (user_id, product_id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);`;

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      category VARCHAR(100) NOT NULL,
      image_url TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      organizer VARCHAR(255) NOT NULL,
      event_date TIMESTAMP WITH TIME ZONE NOT NULL,
      time_description VARCHAR(255) NOT NULL,
      location_name VARCHAR(255) NOT NULL,
      location_address TEXT,
      estimated_attendance INTEGER DEFAULT 0,
      consumption_needed TEXT,
      allow_stalls INTEGER DEFAULT 1,
      coordinator_name VARCHAR(255),
      coordinator_phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Buku Kas Penjualan Santri (Slide 4 LPNU)
  await sql`
    CREATE TABLE IF NOT EXISTS cashbook (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      amount INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'income',
      category VARCHAR(100) DEFAULT 'Penjualan',
      notes TEXT,
      transaction_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_cashbook_user ON cashbook(user_id, transaction_date DESC);
  `;

  console.log('✅ Skema tabel berhasil dibuat di Neon PostgreSQL!');

  // Check if zones are seeded
  const zoneRows = await sql`SELECT count(*) as count FROM zones`;
  const count = Number(zoneRows[0]?.count || 0);

  if (count === 0) {
    console.log('🌱 Melakukan seeding data awal ke Neon PostgreSQL...');

    // 1. Seed Zones
    const zoneMap = new Map();
    for (const z of SEED_ZONES) {
      const res = await sql`
        INSERT INTO zones (name, slug) 
        VALUES (${z.name}, ${z.slug})
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, slug;
      `;
      zoneMap.set(res[0].slug, res[0].id);
    }

    // 2. Seed UMKM
    const umkmMap = new Map();
    for (const u of SEED_UMKM) {
      const zoneId = zoneMap.get(u.zone_slug) || 1;
      const res = await sql`
        INSERT INTO umkm (name, phone, zone_id, is_verified, address)
        VALUES (${u.name}, ${u.phone}, ${zoneId}, 1, ${u.address})
        RETURNING id, name;
      `;
      umkmMap.set(u.name, res[0].id);
    }

    // 3. Seed Products
    for (const p of SEED_PRODUCTS) {
      const umkmId = umkmMap.get(p.umkm_name) || 1;
      await sql`
        INSERT INTO products (umkm_id, name, slug, price, category, image_url, description, views, is_sold_out, shopee_url, bumped_at)
        VALUES (${umkmId}, ${p.name}, ${p.slug}, ${p.price}, ${p.category}, ${p.image_url}, ${p.description}, ${p.views || 0}, ${p.is_sold_out || 0}, ${p.shopee_url || null}, CURRENT_TIMESTAMP)
        ON CONFLICT (slug) DO NOTHING;
      `;
    }

    // 4. Seed Articles
    for (const a of SEED_ARTICLES) {
      await sql`
        INSERT INTO articles (title, slug, category, image_url, summary, content)
        VALUES (${a.title}, ${a.slug}, ${a.category}, ${a.image_url}, ${a.summary}, ${a.content || a.summary})
        ON CONFLICT (slug) DO NOTHING;
      `;
    }

    // 5. Seed Events
    for (const e of SEED_EVENTS) {
      const zoneId = zoneMap.get(e.zone_slug) || 1;
      await sql`
        INSERT INTO events (zone_id, title, slug, organizer, event_date, time_description, location_name, location_address, estimated_attendance, consumption_needed, allow_stalls, coordinator_name, coordinator_phone)
        VALUES (${zoneId}, ${e.title}, ${e.slug}, ${e.organizer}, ${e.event_date}, ${e.time_description}, ${e.location_name}, ${e.location_address || ''}, ${e.estimated_attendance}, ${e.consumption_needed || ''}, ${e.allow_stalls}, ${e.coordinator_name || ''}, ${e.coordinator_phone})
        ON CONFLICT (slug) DO NOTHING;
      `;
    }

    console.log('✅ Seeding data awal ke Neon PostgreSQL berhasil!');
  } else {
    console.log(`ℹ️ Database Neon sudah memiliki ${count} zona MWC.`);
  }

  // Hapus zona non-aktif jika tidak terpakai oleh UMKM, kegiatan, maupun pengguna
  await sql`
    DELETE FROM zones z
    WHERE z.slug IN ('mwc-kangayan', 'mwc-gayam', 'mwc-masalembu')
      AND NOT EXISTS (SELECT 1 FROM umkm u WHERE u.zone_id = z.id)
      AND NOT EXISTS (SELECT 1 FROM events e WHERE e.zone_id = z.id)
      AND NOT EXISTS (SELECT 1 FROM users usr WHERE usr.assigned_zone_id = z.id);
  `;

  const counts = await sql`
    SELECT 
      (SELECT count(*) FROM zones) as zones_count,
      (SELECT count(*) FROM umkm) as umkm_count,
      (SELECT count(*) FROM products) as products_count,
      (SELECT count(*) FROM articles) as articles_count,
      (SELECT count(*) FROM events) as events_count;
  `;
  console.log('📊 Ringkasan Data Neon PostgreSQL:', counts[0]);
}

runMigration().catch((err) => {
  console.error('❌ Gagal menjalankan migrasi Neon:', err);
  process.exit(1);
});
