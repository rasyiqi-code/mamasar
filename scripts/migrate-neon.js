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
      logo_url TEXT,
      phone VARCHAR(50) NOT NULL,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      is_verified INTEGER DEFAULT 0,
      verified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMP WITH TIME ZONE,
      verification_note TEXT,
      address TEXT,
      ranting VARCHAR(255),
      nib VARCHAR(100),
      halal_cert VARCHAR(100),
      pirt VARCHAR(100),
      bpom VARCHAR(100),
      other_legalities TEXT,
      bump_credits INTEGER DEFAULT 0,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      claimed_at TIMESTAMP WITH TIME ZONE,
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
      original_price INTEGER,
      category VARCHAR(100) NOT NULL,
      image_url TEXT NOT NULL,
      gallery_images TEXT DEFAULT '[]',
      description TEXT,
      views INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      featured_until TIMESTAMP WITH TIME ZONE,
      is_sold_out INTEGER DEFAULT 0,
      stock_status VARCHAR(20) NOT NULL DEFAULT 'ready',
      production_capacity VARCHAR(255),
      shopee_url TEXT,
      bumped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Kolom tambahan idempotent agar database eksisting tetap tersinkron
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'warga';`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) NOT NULL DEFAULT 'none';`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone_id INTEGER REFERENCES zones(id);`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_org VARCHAR(255);`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(50);`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_ranting VARCHAR(255);`;

  await sql`ALTER TABLE umkm ALTER COLUMN is_verified SET DEFAULT 0;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS verified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS verification_note TEXT;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS ranting VARCHAR(255);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS nib VARCHAR(100);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS halal_cert VARCHAR(100);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS pirt VARCHAR(100);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS bpom VARCHAR(100);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS other_legalities TEXT;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS bump_credits INTEGER DEFAULT 0;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS slug VARCHAR(255);`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS logo_url TEXT;`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_umkm_slug ON umkm(slug) WHERE slug IS NOT NULL;`;
  await sql`ALTER TABLE umkm ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_umkm_user_id ON umkm(user_id) WHERE user_id IS NOT NULL;`;

  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price INTEGER;`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images TEXT DEFAULT '[]';`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured INTEGER DEFAULT 0;`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) NOT NULL DEFAULT 'ready';`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS production_capacity VARCHAR(255);`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS shopee_url TEXT;`;
  await sql`ALTER TABLE products ALTER COLUMN views SET DEFAULT 0;`;

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
      umkm_id INTEGER REFERENCES umkm(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      amount INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'income',
      category VARCHAR(100) DEFAULT 'Penjualan',
      reference_type VARCHAR(50),
      reference_id INTEGER,
      notes TEXT,
      transaction_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE cashbook ADD COLUMN IF NOT EXISTS umkm_id INTEGER REFERENCES umkm(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE cashbook ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);`;
  await sql`ALTER TABLE cashbook ADD COLUMN IF NOT EXISTS reference_id INTEGER;`;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_cashbook_user ON cashbook(user_id, transaction_date DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cashbook_umkm ON cashbook(umkm_id, transaction_date DESC);
  `;

  // Tabel Promosi / Iklan Berbayar & Token Sundul
  await sql`
    CREATE TABLE IF NOT EXISTS ad_promotions (
      id SERIAL PRIMARY KEY,
      umkm_id INTEGER NOT NULL REFERENCES umkm(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(50) DEFAULT 'qris',
      proof_image_url TEXT,
      notes TEXT,
      duration_days INTEGER,
      bump_amount INTEGER,
      starts_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE ad_promotions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;`;
  await sql`ALTER TABLE ad_promotions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;`;
  await sql`ALTER TABLE ad_promotions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ad_promotions_umkm ON ad_promotions(umkm_id, status);`;

  // Riwayat transaksi token sundul
  await sql`
    CREATE TABLE IF NOT EXISTS bump_ledger (
      id SERIAL PRIMARY KEY,
      umkm_id INTEGER NOT NULL REFERENCES umkm(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      promotion_id INTEGER REFERENCES ad_promotions(id) ON DELETE SET NULL,
      delta INTEGER NOT NULL,
      reason VARCHAR(50) NOT NULL,
      reference_id INTEGER,
      balance_after INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE bump_ledger ADD COLUMN IF NOT EXISTS reference_id INTEGER;`;
  await sql`ALTER TABLE bump_ledger ADD COLUMN IF NOT EXISTS balance_after INTEGER NOT NULL DEFAULT 0;`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bump_ledger_umkm ON bump_ledger(umkm_id, created_at DESC);`;

  // Jejak audit & notifikasi warga
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(40) NOT NULL,
      target_id INTEGER,
      metadata_json TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata_json TEXT;`;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'metadata'
      ) THEN
        UPDATE audit_log SET metadata_json = metadata WHERE metadata_json IS NULL AND metadata IS NOT NULL;
      END IF;
    END $$;
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);`;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      link VARCHAR(255),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';`;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);`;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
      ) THEN
        EXECUTE 'UPDATE notifications SET body = message WHERE (body = '''' OR body IS NULL) AND message IS NOT NULL';
        EXECUTE 'ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link_url'
      ) THEN
        EXECUTE 'UPDATE notifications SET link = LEFT(link_url, 255) WHERE link IS NULL AND link_url IS NOT NULL';
      END IF;
    END $$;
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);`;

  // Pesanan konsumsi / pendaftaran lapak UMKM pada kegiatan NU
  await sql`
    CREATE TABLE IF NOT EXISTS event_orders (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      umkm_id INTEGER REFERENCES umkm(id) ON DELETE SET NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'consumption',
      sender_name VARCHAR(255) NOT NULL,
      sender_phone VARCHAR(50) NOT NULL,
      item_description TEXT NOT NULL,
      quantity_or_slots VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_orders_event ON event_orders(event_id, created_at DESC);`;

  // Backfill slug toko agar setiap UMKM memiliki URL SEO-friendly (/toko/[slug])
  const storesMissingSlug = await sql`SELECT id, name FROM umkm WHERE slug IS NULL ORDER BY id ASC`;
  if (storesMissingSlug.length > 0) {
    const existingSlugRows = await sql`SELECT slug FROM umkm WHERE slug IS NOT NULL`;
    const usedSlugs = new Set(existingSlugRows.map((r) => String(r.slug)));
    for (const row of storesMissingSlug) {
      const base =
        String(row.name || 'toko')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'toko';
      const candidate = usedSlugs.has(base) ? `${base}-${row.id}` : base;
      usedSlugs.add(candidate);
      await sql`UPDATE umkm SET slug = ${candidate} WHERE id = ${row.id}`;
    }
    console.log(`✅ Backfill slug untuk ${storesMissingSlug.length} toko selesai.`);
  }

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
