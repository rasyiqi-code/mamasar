# Mamasar - Direktori Digital UMKM NU Sumenep

Aplikasi direktori dan marketplace mandiri UMKM Nahdliyin se-Kabupaten Sumenep. Dibangun dengan arsitektur modern berbasis **Astro (SSR)**, **Tailwind CSS 4**, dan **Drizzle ORM di atas Neon PostgreSQL Serverless**. Terintegrasi dengan Neon Auth, Neon Object Storage, dan ImageKit CDN untuk deployment cloud berkinerja tinggi. Tampilan *mobile-first*, ramah SEO (Schema.org & Open Graph), dan konversi 100% langsung ke WhatsApp penjual tanpa potongan biaya komisi.

---

## 🚀 Fitur Utama & Rute Aplikasi

### 1. Halaman Publik & Katalog Warga
- **Beranda [`/`](http://localhost:4321/)**: Katalog produk dengan filter 24 zona MWC (18 daratan & 6 kepulauan), kategori produk, pencarian bebas (`q`), paginasi (`page`, `12` item/halaman), dan opsi pengurutan (*Terbaru*, *Harga Terendah*, *Harga Tertinggi*).
- **Detail Produk [`/produk/[slug]`](http://localhost:4321/produk/rengginang-lorjuk-super-asli-gapura)**: Metadata Schema.org `Product`, galeri multi-foto, kartu Open Graph, penghitung penayangan riil (*view counter*) dengan proteksi cookie debounce, status ketersediaan stok, tautan opsional Shopee, dan tombol WhatsApp otomatis. Tautan lama `/p/[slug]` dialihkan permanen (`301`).
- **Direktori Toko [`/toko`](http://localhost:4321/toko) & Profil Toko [`/toko/[slug]`](http://localhost:4321/toko/kerajinan-mwc-gapura)**: Direktori unit usaha UMKM per MWC dengan lencana resmi `✓ Verified MWC NU`, etalase katalog milik toko, informasi legalitas usaha, dan tombol chat langsung ke pemilik toko. Akses berbasis ID numerik (`/toko/1`) dialihkan `301` ke slug kanonik.
- **Kegiatan NU & Pasar Konsumsi [`/kegiatan`](http://localhost:4321/kegiatan) & [`/kegiatan/[slug]`](http://localhost:4321/kegiatan/lailatul-ijtima-mwc-gapura)**: Jadwal pengajian akbar, Lailatul Ijtima', dan Harlah se-Sumenep. Dilengkapi formulir pengajuan pesanan konsumsi/lapak bazar warga (`/api/events/order`) dengan moderasi status oleh pengurus.
- **Pusat Edukasi & Panduan Usaha [`/edukasi`](http://localhost:4321/edukasi) & [`/edukasi/[slug]`](http://localhost:4321/edukasi/sertifikasi-halal-gratis-sehati-umkm-sumenep)**: Pusat edukasi terpadu mencakup rubrik unggulan **Ekonomi Pekarangan Santri** (budidaya cabai jamu, lele bioflok, pupuk organik POC), panduan sertifikasi halal gratis (SEHATI BPJPH), tips transaksi COD aman, serta katalog video studi kasus (`/edukasi/video/[id]`). Tampil di navigasi dengan label menu **Edukasi**.
- **Produk Favorit [`/favorit`](http://localhost:4321/favorit)**: Penyimpanan produk favorit berbasis database Neon Postgres untuk pengguna terdaftar (SSR instan) serta sinkronisasi otomatis (*auto-sync*) dari `localStorage` browser pengguna tamu saat masuk/login.
- **Privasi & Hak Data [`/privasi`](http://localhost:4321/privasi)**, **Halaman Error [`/404`](http://localhost:4321/404)**, **`/500`**, `sitemap.xml`, dan `robots.txt`.

### 2. Manajemen & Hak Akses (RBAC 4-Level & Single Identity)
Sistem menggunakan arsitektur *Role-Based Access Control* (RBAC) 4 peran berjenjang dengan pembatasan zona MWC (`assigned_zone_id`), di mana status penjual (*merchant*) berbasis kepemilikan relasi data toko (`user.umkm`):
- **`pcnu`**: Pengurus Cabang NU / Superadmin dengan akses global seluruh konsol administrasi [`/admin`](http://localhost:4321/admin), manajemen zona, persetujuan kader, moderasi toko/promosi, edukasi, dan agenda.
- **`mwcnu`**: Pengurus Majelis Wakil Cabang tingkat kecamatan, terbatas pada wilayah tugas `assigned_zone_id` untuk verifikasi toko, peninjauan promosi, dan agenda kegiatan kecamatannya.
- **`ranting`**: Kader pendata lapangan tingkat desa/ranting pada portal [`/petugas`](http://localhost:4321/petugas) untuk pendataan UMKM terverifikasi di kecamatannya.
- **`warga`**: Akun jamaah/warga umum. Berperan sebagai **Pembeli** dan otomatis menjadi **Penjual (Merchant)** begitu membuka profil toko di [`/dashboard`](http://localhost:4321/dashboard) atau [`/pasang-iklan`](http://localhost:4321/pasang-iklan).

#### Rincian Halaman Pengelolaan:
- **Konsol Superadmin [`/admin`](http://localhost:4321/admin)**:
  - Panel persetujuan (*approval gate*) kader petugas lapangan MWC dengan aksi 1-klik Setujui / Tolak.
  - Moderasi toko UMKM: pemberian status verifikasi centang hijau resmi MWC NU dan penghapusan toko bermasalah.
  - Ringkasan statistik sistem: jumlah toko, produk aktif, perputaran kas, dan sebaran petugas per MWC.
  - Rute lama `/pengurus`, `/agen`, dan `/daftar-toko` otomatis dialihkan permanen (`301 redirect`) masing-masing ke `/admin`, `/pasang-iklan`, dan `/dashboard`.
- **Portal Petugas Lapangan [`/petugas`](http://localhost:4321/petugas)**:
  - Antarmuka relawan kader MWC bersih dan bebas template usang OsClass.
  - Alur pendaftaran mandiri kader dengan pilihan MWC penugasan dan nomor WhatsApp.
  - Pencegahan duplikasi toko: otomatis mendeteksi nomor WhatsApp toko yang sudah ada sebelum membuat toko baru.
  - Kompresi foto kamera HP otomatis di browser menggunakan HTML5 Canvas untuk menghemat kuota internet kader.
- **Dashboard Toko Mandiri [`/dashboard`](http://localhost:4321/dashboard)**:
  - Autentikasi ganda via Neon Auth (Google Social Login & Email/Kata Sandi) dengan pesan galat ramah pengguna dan dukungan domain kustom produksi `mamasar.com`.
  - Sub-halaman modul terdedikasi: [`/dashboard/produk`](http://localhost:4321/dashboard/produk) (katalog toko), [`/dashboard/kas`](http://localhost:4321/dashboard/kas) (pembukuan), [`/dashboard/kemitraan`](http://localhost:4321/dashboard/kemitraan) (kemitraan & acara), dan [`/dashboard/profil`](http://localhost:4321/dashboard/profil) (identitas usaha).
  - Pengaturan profil usaha: perbarui nama toko, unggah logo toko (`logo_url` via CDN ImageKit), WhatsApp aktif, zona MWC, ranting, legalitas usaha (NIB, Halal, P-IRT, BPOM), dan alamat toko.
  - Manajemen etalase produk: tambah produk baru (dukungan galeri multi-foto hingga 4 foto), edit nama/harga/kategori/deskripsi/foto, ubah status ketersediaan (*Tersedia / Habis*), sundul iklan (*bump to top*), dan hapus iklan.
  - **Buku Kas Usaha**:
    - Dropdown *Isi Cepat Produk* yang otomatis mengisi nama transaksi dan nominal harga barang.
    - Input tanggal transaksi mundur/kemarin (`transactionDate`).
    - **Ekspor Laporan Kas ke CSV (`.csv`)**: Tombol `📊 Unduh CSV` untuk mengekspor rekap pembukuan toko ke format Excel.
    - Klaim toko otomatis bagi pemilik toko hasil pendataan jemput bola lapangan.

### 3. Ekosistem & PWA
- Progressive Web App (PWA) aktif penuh: Service Worker (`/sw.js`), Web App Manifest (`public/manifest.webmanifest`), manifest shortcuts, dan komponen banner instalasi responsif (`pwa-install-banner`) lengkap dengan panduan khusus iOS Safari (*Add to Home Screen*).
- Konfigurasi aplikasi native Android via Capacitor (`capacitor.config.json`).
- Mobile bottom navigation 5 tombol ergonomis: Beranda, Favorit, Pasang Cepat (+), Toko, dan Toko Saya/Admin.
- Penyimpanan media hybrid: Gambar produk dan logo toko ke CDN ImageKit (dengan fallback disk lokal), avatar ke Neon Object Storage S3 (dengan fallback disk lokal).
- Domain produksi kustom `https://mamasar.com` tersinkronisasi pada *Trusted Origins* Neon Auth (Google OAuth & Better Auth).

---

## 💻 Menjalankan di Komputer Lokal

### Prasyarat
- Node.js versi 20+ (disarankan Node.js 22 LTS).
- Akun atau koneksi basis data **Neon PostgreSQL**.

### Langkah Instalasi
```bash
# 1. Clone repositori
git clone https://github.com/rasyiqi/mamasar.git
cd mamasar

# 2. Pasang dependensi
npm install

# 3. Salin konfigurasi environment
cp .env.example .env

# 4. Jalankan server pengembangan
npm run dev
```

Buka peramban di `http://localhost:4321`.

### Menjalankan Dev Server di Latar Belakang
Sesuai panduan proyek, Anda dapat menjalankan Astro dev server di mode background:
```bash
# Jalankan di background
npx astro dev --background

# Cek status dan log
npx astro dev status
npx astro dev logs

# Hentikan server
npx astro dev stop
```

---

## 🗄️ Migrasi Database & Seeding

Untuk membuat tabel skema (termasuk kolom relasi petugas, toko, dan tabel favorit) serta mengisi data awal wilayah 24 MWC NU Sumenep:

```bash
node --env-file=.env scripts/migrate-neon.js
```

---

## 🛠️ Perintah Eksekusi (Bun / npm)

Proyek ini menggunakan runtime **Bun** (dengan fallback kompatibel penuh ke Node.js & npm):

| Perintah Bun | Perintah npm | Fungsi |
| :--- | :--- | :--- |
| `bun run dev` | `npm run dev` | Menjalankan Astro dev server interaktif (`localhost:4321`) |
| `bun run check` | `npm run check` | Menjalankan validasi tipe Astro & TypeScript (`astro check`) |
| `bun test` | `npm test` | Menjalankan test suite unit (keamanan, anti-SSRF, RBAC, ImageKit, API Elysia) |
| `bun run build` | `npm run build` | Melakukan build produksi server & aset klien ke folder `dist/` |
| `bun run preview` | `npm run preview` | Melakukan pratinjau lokal hasil build produksi |
| `bun run start` | `npm start` | Menjalankan server dari hasil build produksi (`dist/server/entry.mjs`) |
| `node --env-file=.env scripts/migrate-neon.js` | `node --env-file=.env scripts/migrate-neon.js` | Menjalankan DDL migrasi dan seed database Neon Postgres |

---

## 🔑 Variabel Lingkungan

Seluruh konfigurasi lingkungan tersedia di [`.env.example`](./.env.example):

- **Server**: `HOST`, `PORT`, `SITE_URL` (contoh lokal: `http://localhost:4321`, produksi: `https://mamasar.com`)
- **Database**: `DATABASE_URL` (Koneksi pooling Neon Postgres) & `DATABASE_URL_UNPOOLED`
- **Superadmin**: `SUPERADMIN_EMAIL` (Email pemilik akses penuh konsol `/admin`, contoh: `info.rasyiqi@gmail.com`)
- **Media CDN**: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` (CDN foto produk & logo toko)
- **Autentikasi Neon**: `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` (Better Auth & Google Social Login)
- **Object Storage S3**: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Operasional**: `WHATSAPP_HELP` (Nomor pusat bantuan pengurus MWC/PCNU, format: `628xxxxxxxxxx`)

---

## 🚢 Panduan Deployment

### 1. VPS / Server Node.js / Bun Mandiri
```bash
bun run build
# Jalankan entry point server
bun run dist/server/entry.mjs
```

### 2. Vercel
1. Hubungkan repositori GitHub ke proyek baru di Vercel.
2. Tambahkan variabel lingkungan dari `.env.example` ke dashboard Vercel.
3. Vercel akan otomatis mendeteksi konfigurasi Astro (`@astrojs/vercel`) dan mendeploy fungsi serverless secara instan.
4. Pastikan domain kustom (`https://mamasar.com`) telah didaftarkan pada *Trusted Domains* di konsol Neon Auth.

---

## 📁 Struktur Direktori

```
mamasar/
├── src/
│   ├── client/          # Antarmuka Klien (Astro SSR srcDir)
│   │   ├── components/  # Komponen UI (ProductCard, PromoSlider, admin, dashboard, common)
│   │   ├── layouts/     # Layout utama (Layout.astro, AppLayout.astro), meta SEO, PWA & nav
│   │   ├── pages/       # Rute halaman (/admin, /dashboard, /edukasi, /produk, /toko, dll.)
│   │   ├── scripts/     # Client-side TypeScript (admin.client.ts, dashboard.client.ts)
│   │   └── styles/      # Styling global Tailwind CSS 4 (global.css)
│   ├── server/          # Backend Server & API Routes (Elysia.js)
│   │   ├── routes/      # Endpoint modular (auth, products, umkm, admin, user, events, favorites)
│   │   ├── context.ts   # Resolver sesi, IP rate-limiter, dan RBAC context
│   │   └── serve.ts     # Standalone runtime server
│   └── lib/             # Fondasi Logika & Database
│       ├── modules/     # Domain modules (products, stores, articles, events, cashbook, rbac)
│       ├── schema.ts    # Definisi skema tabel Drizzle ORM (PostgreSQL)
│       ├── db.ts        # Database client & transaksi data Neon
│       ├── neon-auth.ts # Helper integrasi Neon Auth / Better Auth
│       ├── storage.ts   # Handler CDN ImageKit & Neon S3 Object Storage
│       └── utils.ts     # Sanitasi, slugifier, validator nomor telepon HP Indonesia
├── tests/               # Test suite otomatis (security, rbac, utils, api-elysia)
├── scripts/             # Skrip migrasi DDL & seed data Neon Postgres
├── public/              # Manifest PWA (/manifest.webmanifest), service worker (/sw.js), favicon, ikon SVG
├── DOCS/                # Dokumentasi teknis arsitektur, API, database, dan Android
├── capacitor.config.json# Konfigurasi pembungkus aplikasi native Android
└── ROADMAP.md           # Peta jalan pengembangan fitur per fase
```

---

## 📚 Dokumentasi Terkait

- [ROADMAP.md](./ROADMAP.md): Peta jalan pengembangan dari Fase 1 hingga Fase 8.
- [DOCS/API.md](./DOCS/API.md): Spesifikasi lengkap seluruh endpoint REST API.
- [DOCS/DATABASE.md](./DOCS/DATABASE.md): Skema tabel dan relasi Neon PostgreSQL.
- [DOCS/ANDROID_CAPACITOR.md](./DOCS/ANDROID_CAPACITOR.md): Panduan kompilasi aplikasi Android APK/AAB.
- [DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md](./DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md): Rincian integrasi cloud.
