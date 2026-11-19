# Dokumentasi Skema Database (Neon PostgreSQL)

Aplikasi **Pasar Warga NU Sumenep** memakai **Neon PostgreSQL** sebagai database tunggal:

1. **Neon PostgreSQL (satu-satunya database)**: `src/lib/db.ts` menjalankan semua operasi baca/tulis halaman dan API lewat Drizzle ORM (`drizzle-orm/neon-http`) di atas driver serverless `@neondatabase/serverless` dengan `DATABASE_URL`. Semua fungsi bersifat async; definisi tabel ada di `src/lib/schema.ts`.

Skema dan seed cloud dikelola lewat `scripts/migrate-neon.js`. Jalur SQLite era awal (skrip seed/backup, `better-sqlite3`) sudah dihapus.

---

## Diagram Relasi Entitas (ERD)

```mermaid
erDiagram
    USERS ||--o| UMKM : "mengelola"
    USERS ||--o{ SESSIONS : "memiliki"
    USERS ||--o{ CASHBOOK : "mencatat"
    ZONES ||--o{ UMKM : "menaungi"
    ZONES ||--o{ EVENTS : "lokasi"
    UMKM ||--o{ PRODUCTS : "memiliki"
    EVENTS ||--o{ EVENT_ORDERS : "menerima"
    UMKM ||--o{ EVENT_ORDERS : "berpartisipasi"
    UMKM ||--o{ AD_PROMOTIONS : "memesan"
    UMKM ||--o{ BUMP_LEDGER : "mutasi_sundul"
    USERS ||--o{ FAVORITES : "menyimpan"
    USERS ||--o{ NOTIFICATIONS : "menerima"

    USERS {
        INTEGER id PK
        VARCHAR google_id UK
        VARCHAR email UK
        VARCHAR name
        VARCHAR avatar_url
        TIMESTAMP created_at
    }

    SESSIONS {
        VARCHAR id PK
        INTEGER user_id FK
        TIMESTAMP expires_at
    }

    ZONES {
        INTEGER id PK
        VARCHAR name
        VARCHAR slug UK
    }

    UMKM {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER created_by_user_id FK
        VARCHAR name
        VARCHAR slug UK
        TEXT logo_url
        VARCHAR phone
        INTEGER zone_id FK
        VARCHAR ranting
        INTEGER is_verified
        INTEGER bump_credits
        TEXT address
        VARCHAR nib
        VARCHAR halal_cert
        VARCHAR pirt
        VARCHAR bpom
        TEXT other_legalities
        TEXT maps_url
        TEXT qris_image_url
        TIMESTAMP created_at
    }

    PRODUCTS {
        INTEGER id PK
        INTEGER umkm_id FK
        VARCHAR name
        VARCHAR slug UK
        INTEGER price
        INTEGER original_price
        VARCHAR category
        TEXT image_url
        TEXT gallery_images
        TEXT description
        INTEGER views
        INTEGER is_sold_out
        VARCHAR stock_status
        VARCHAR production_capacity
        TIMESTAMP bumped_at
        TEXT shopee_url
        TIMESTAMP created_at
    }

    ARTICLES {
        INTEGER id PK
        VARCHAR title
        VARCHAR slug UK
        VARCHAR category
        TEXT image_url
        TEXT summary
        TEXT content
        TIMESTAMP created_at
    }

    CASE_STUDIES {
        INTEGER id PK
        VARCHAR title
        VARCHAR channel_name
        VARCHAR tag
        VARCHAR duration
        TEXT video_url
        TEXT thumbnail_url
        TEXT practice_summary
        TEXT opportunity_summary
        INTEGER sort_order
        INTEGER is_active
        TIMESTAMP created_at
    }

    EVENTS {
        INTEGER id PK
        INTEGER zone_id FK
        VARCHAR title
        VARCHAR slug UK
        VARCHAR organizer
        TIMESTAMP event_date
        VARCHAR time_description
        VARCHAR location_name
        TEXT location_address
        INTEGER estimated_attendance
        TEXT consumption_needed
        INTEGER allow_stalls
        VARCHAR coordinator_name
        VARCHAR coordinator_phone
        TIMESTAMP created_at
    }

    CASHBOOK {
        INTEGER id PK
        INTEGER user_id FK
        VARCHAR title
        INTEGER amount
        VARCHAR type
        VARCHAR category
        TEXT notes
        DATE transaction_date
        TIMESTAMP created_at
    }
```

---

## Spesifikasi Tabel

### 1. Tabel `zones` (Wilayah MWC NU)

Menyimpan 24 wilayah Majelis Wakil Cabang (MWC) NU se-Kabupaten Sumenep: 18 MWC daratan dan 6 MWC kepulauan. Daftar lengkap ada di `SEED_ZONES` pada `src/lib/seeds.ts`.

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID unik zona MWC |
| `name` | `TEXT` | NOT NULL | Nama MWC (contoh: `MWC Kota Sumenep`, `MWC Gapura`) |
| `slug` | `TEXT` | NOT NULL UNIQUE | Slug URL (contoh: `mwc-kota-sumenep`) |

---

### 2. Tabel `umkm` (Profil Penjual / Toko Warga)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID toko / usaha |
| `user_id` | `INTEGER` | NULLABLE REFERENCES users(id) | Akun pemilik toko. `NULL` untuk data hasil pendataan agen/kader lapangan |
| `created_by_user_id` | `INTEGER` | NULLABLE REFERENCES users(id) | Akun petugas kader yang pertama kali mendaftarkan toko |
| `name` | `TEXT` | NOT NULL | Nama usaha / toko |
| `slug` | `TEXT` | NOT NULL UNIQUE | Slug unik halaman toko (`/toko/[slug]`) |
| `logo_url` | `TEXT` | NULLABLE | URL logo toko (ImageKit CDN atau lokal `/uploads/...`) |
| `phone` | `TEXT` | NOT NULL | Nomor WhatsApp terstandardisasi (`628xx`) |
| `zone_id` | `INTEGER` | NOT NULL REFERENCES zones(id) | Relasi ke zona MWC domisili usaha |
| `ranting` | `TEXT` | NULLABLE | Nama desa / ranting kepengurusan NU |
| `is_verified` | `INTEGER` | DEFAULT 0 | 1 = terverifikasi centang hijau resmi MWC NU, 0 = pending/menunggu moderasi |
| `verified_by_user_id` | `INTEGER` | NULLABLE REFERENCES users(id) | Akun pengurus yang memverifikasi toko |
| `verified_at` | `TIMESTAMP` | NULLABLE | Waktu verifikasi resmi |
| `verification_note` | `TEXT` | NULLABLE | Catatan kurasi / rekomendasi pengurus |
| `address` | `TEXT` | NULLABLE | Dusun/desa atau alamat fisik operasional toko |
| `nib` | `TEXT` | NULLABLE | Nomor Induk Berusaha (NIB) |
| `halal_cert` | `TEXT` | NULLABLE | Nomor sertifikat halal BPJPH / SEHATI |
| `pirt` | `TEXT` | NULLABLE | Nomor izin edar P-IRT Dinkes |
| `bpom` | `TEXT` | NULLABLE | Nomor registrasi izin BPOM |
| `other_legalities` | `TEXT` | NULLABLE | Legalitas atau izin usaha lainnya |
| `maps_url` | `TEXT` | NULLABLE | Tautan Google Maps lokasi toko |
| `qris_image_url` | `TEXT` | NULLABLE | Gambar barcode pembayaran QRIS toko |
| `bump_credits` | `INTEGER` | DEFAULT 0 | Saldo kuota sundul iklan toko |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Waktu pendaftaran toko |

---

### 3. Tabel `products` (Katalog Iklan Produk)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID iklan produk |
| `umkm_id` | `INTEGER` | NOT NULL REFERENCES umkm(id) | Relasi ke pemilik UMKM |
| `name` | `TEXT` | NOT NULL | Nama produk |
| `slug` | `TEXT` | NOT NULL UNIQUE | Slug SEO unik (contoh: `rengginang-lorjuk-spesial-k7x8`) |
| `price` | `INTEGER` | NOT NULL | Harga jual satuan dalam Rupiah |
| `original_price` | `INTEGER` | NULLABLE | Harga coret sebelum diskon (opsional) |
| `category` | `TEXT` | NOT NULL | Salah satu nilai `PRODUCT_CATEGORIES` di `src/lib/constants.ts` |
| `image_url` | `TEXT` | NOT NULL | URL foto utama produk (ImageKit CDN atau lokal `/uploads/...`) |
| `gallery_images` | `TEXT` | NULLABLE | JSON array string berisi hingga 4 foto tambahan produk |
| `description` | `TEXT` | NULLABLE | Deskripsi detail produk |
| `views` | `INTEGER` | DEFAULT 0 | Jumlah tampilan unik halaman produk (debounce 1 jam) |
| `is_sold_out` | `INTEGER` | DEFAULT 0 | 1 = habis/terjual, 0 = tersedia |
| `stock_status` | `TEXT` | DEFAULT 'ready' | Status ketersediaan stok (`ready`, `preorder`, `limited`, `empty`) |
| `production_capacity`| `TEXT` | NULLABLE | Estimasi kapasitas produksi (contoh: `50 bungkus / hari`) |
| `shopee_url` | `TEXT` | NULLABLE | Tautan produk di marketplace Shopee (opsional) |
| `is_featured` | `INTEGER` | DEFAULT 0 | Status produk promosi pilihan/unggulan |
| `featured_until` | `TIMESTAMP` | NULLABLE | Batas kedaluwarsa status promosi unggulan |
| `bumped_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Waktu sundulan terakhir (menentukan urutan katalog) |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Waktu pertama kali terbit |

---

### 4. Tabel `articles` (Menu Edukasi & Panduan Usaha)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID artikel |
| `title` | `TEXT` | NOT NULL | Judul artikel |
| `slug` | `TEXT` | NOT NULL UNIQUE | Slug URL artikel (`/edukasi/[slug]`) |
| `category` | `TEXT` | NOT NULL | Kategori artikel (misal: `Ekonomi Pekarangan`, `Panduan Usaha`, `Legalitas & Halal`, `Tips Transaksi`) |
| `image_url` | `TEXT` | NOT NULL | Gambar banner artikel |
| `summary` | `TEXT` | NOT NULL | Ringkasan untuk card di beranda & katalog edukasi |
| `content` | `TEXT` | NULLABLE | Isi lengkap artikel dalam format Markdown / HTML |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Tanggal terbit artikel |

---

### 4.1. Tabel `case_studies` (Video Studi Kasus Usaha & Inspirasi Santri)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID video studi kasus |
| `title` | `TEXT` | NOT NULL | Judul video / materi inspirasi usaha |
| `channel_name` | `TEXT` | NOT NULL | Nama channel YouTube / narasumber |
| `tag` | `TEXT` | NOT NULL | Tag rubrik (contoh: `Praktik Nyata`, `Inspirasi Santri`) |
| `duration` | `TEXT` | DEFAULT '15 Menit' | Estimasi durasi tonton video |
| `video_url` | `TEXT` | NOT NULL | URL embed/tautan video YouTube |
| `thumbnail_url` | `TEXT` | NOT NULL | URL poster/thumbnail video |
| `practice_summary` | `TEXT` | NULLABLE | Poin ringkasan praktik lapangan |
| `opportunity_summary`| `TEXT` | NULLABLE | Analisis peluang dan kalkulasi potensi cuan |
| `sort_order` | `INTEGER` | DEFAULT 0 | Urutan penayangan pada galeri video |
| `is_active` | `INTEGER` | DEFAULT 1 | 1 = tayang, 0 = diarsipkan |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Waktu ditambahkan |

---

### 5. Tabel `events` (Direktori Kegiatan NU & Pasar Konsumsi)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID kegiatan |
| `zone_id` | `INTEGER` | NOT NULL REFERENCES zones(id) | Lokasi MWC acara |
| `title` | `TEXT` | NOT NULL | Nama kegiatan |
| `slug` | `TEXT` | NOT NULL UNIQUE | Slug URL kegiatan |
| `organizer` | `TEXT` | NOT NULL | Penyelenggara |
| `event_date` | `DATETIME` | NOT NULL | Tanggal pelaksanaan |
| `time_description` | `TEXT` | NOT NULL | Keterangan waktu (contoh: `19.30 WIB (Ba'da Isya) - Selesai`) |
| `location_name` | `TEXT` | NOT NULL | Nama tempat |
| `location_address` | `TEXT` | NULLABLE | Alamat lengkap lokasi |
| `estimated_attendance` | `INTEGER` | DEFAULT 0 | Estimasi jumlah jamaah |
| `consumption_needed` | `TEXT` | NULLABLE | Kebutuhan konsumsi panitia |
| `allow_stalls` | `INTEGER` | DEFAULT 1 | 1 = warga boleh membuka lapak |
| `coordinator_name` | `TEXT` | NULLABLE | Nama koordinator / seksi konsumsi |
| `coordinator_phone` | `TEXT` | NOT NULL | Nomor WhatsApp koordinator |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | Waktu posting agenda |

---

### 6. Tabel `users` (Akun Pengguna)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY | ID pengguna |
| `google_id` | `TEXT` | NOT NULL UNIQUE | Identitas eksternal. Untuk Neon Auth diisi `neon_<user_id>` |
| `email` | `TEXT` | NOT NULL UNIQUE | Alamat email |
| `name` | `TEXT` | NOT NULL | Nama lengkap |
| `avatar_url` | `TEXT` | NULLABLE | Foto profil — URL http(s) (mis. foto Google) atau *key* objek Neon Object Storage (`avatars/...`) yang di-presign saat render |
| `role` | `VARCHAR(20)` | NOT NULL DEFAULT `'warga'` | `'warga'` = pengguna biasa; `'pengurus'` = boleh membuka `/pengurus` (verifikasi/cabut/hapus toko). Promosi dilakukan manual lewat SQL console |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | Waktu registrasi pertama |

**Mempromosi pengurus MWC** (tidak ada UI-nya — sengaja, agar hak verifikasi tidak bisa dinaikkan lewat aplikasi):

```sql
UPDATE users SET role = 'pengurus' WHERE email = 'nama@nu.or.id';
```

Setelah login, pengurus melihat banner "Panel Pengurus MWC" di `/dashboard` yang menuju `/pengurus`.

---

### 7. Tabel `sessions` (Sesi Login Aplikasi)

Sesi lokal yang dibuat aplikasi setelah login Neon Auth atau OAuth Google. Sesi asli Neon Auth disimpan di luar database aplikasi. Sesi kedaluwarsa dibersihkan otomatis (janitor probabilistik saat `createSession`).

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY | Token sesi acak |
| `user_id` | `INTEGER` | NOT NULL REFERENCES users(id) | Pemilik akun |
| `expires_at` | `DATETIME` | NOT NULL | Waktu kedaluwarsa (30 hari) |

---

### 8. Tabel `cashbook` (Buku Kas Penjualan)

| Kolom | Tipe Data | Modifiers | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | ID catatan |
| `user_id` | `INTEGER` | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Pemilik catatan |
| `title` | `TEXT` | NOT NULL | Judul transaksi |
| `amount` | `INTEGER` | NOT NULL | Nominal dalam Rupiah, selalu positif |
| `type` | `TEXT` | NOT NULL DEFAULT `'income'` | `income` atau `expense` |
| `category` | `TEXT` | DEFAULT `'Penjualan'` | Kategori transaksi |
| `notes` | `TEXT` | NULLABLE | Catatan tambahan |
| `transaction_date` | `DATE` | DEFAULT `DATE('now')` | Tanggal transaksi |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | Waktu pencatatan |

---

## DDL PostgreSQL untuk Neon (`schema.sql`)

Jalankan di Neon SQL Editor, atau pakai `scripts/migrate-neon.js` yang membuat tabel sekaligus melakukan seed.

```sql
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'warga',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

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
  bumped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  shopee_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_cashbook_user ON cashbook(user_id, transaction_date DESC);
```

---

## Sinkronisasi skema

`scripts/migrate-neon.js` (DDL), `src/lib/schema.ts` (mirror Drizzle), dan modul di `src/lib/modules/` (`src/lib/db.ts` sebagai facade) sinkron untuk tabel: `zones`, `umkm` (termasuk kolom kanonik `slug` & indeks unik `uq_umkm_slug`), `products` (termasuk `gallery_images`, `is_featured`, `featured_until`, `shopee_url`, `views` default 0), `articles`, `events`, `event_orders`, `users` (dengan peran RBAC 4-level: `pcnu`, `mwcnu`, `ranting`, `warga`), `sessions`, `favorites`, `cashbook`, `ad_promotions`, `bump_ledger`, `audit_log`, dan `notifications`. Saat mengubah DDL di `migrate-neon.js`, ubah juga `schema.ts` agar tetap sejajar.

---

## Perintah database

```bash
# Buat skema dan seed Neon Postgres (jalur utama)
DATABASE_URL="postgresql://..." node scripts/migrate-neon.js

# Uji baca/tulis seluruh fungsi db.ts terhadap Neon (membersihkan datanya sendiri)
set -a && . ./.env && set +a && npx tsx scripts/db-smoke.mjs

# Uji siklus avatar (upload key → presign render) terhadap Neon Object Storage
set -a && . ./.env && set +a && npx tsx scripts/avatar-smoke.mjs
```

Skrip migrasi mengimpor `src/lib/seeds.ts` langsung, jadi butuh Node 22.18+ atau Node 24.

Runtime aplikasi WAJIB `DATABASE_URL`; tanpa itu semua query gagal dengan error eksplisit (`getNeonSql()` throw). Skrip SQLite era awal (`seed.js`, `backup.js`, dependency `better-sqlite3`) sudah dihapus.
