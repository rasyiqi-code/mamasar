# Direktori Digital UMKM NU Sumenep (Pasar Warga NU / Mamasar)

Aplikasi direktori dan marketplace mandiri UMKM Nahdliyin se-Kabupaten Sumenep. Dibangun dengan arsitektur modern berbasis **Astro (SSR)**, **Tailwind CSS 4**, dan **Drizzle ORM di atas Neon PostgreSQL Serverless**. Terintegrasi dengan Neon Auth, Neon Object Storage, dan ImageKit CDN untuk deployment cloud berkinerja tinggi. Tampilan *mobile-first*, ramah SEO (Schema.org & Open Graph), dan konversi 100% langsung ke WhatsApp penjual tanpa potongan biaya komisi.

---

## 🚀 Fitur Utama & Rute Aplikasi

### 1. Halaman Publik & Katalog Warga
- **Beranda [`/`](http://localhost:4321/)**: Katalog produk dengan filter 27 zona MWC (18 daratan & 9 kepulauan), kategori produk, pencarian bebas (`q`), dan opsi pengurutan (*Terbaru*, *Harga Terendah*, *Harga Tertinggi*). Dilengkapi slider kampanye gerakan belanja tetangga.
- **Detail Produk [`/p/[slug]`](http://localhost:4321/p/rengginang-lorjuk-super-asli-gapura)**: Metadata Schema.org `Product`, kartu Open Graph, penghitung penayangan riil (*view counter*) dengan proteksi cookie debounce, status ketersediaan stok, tautan opsional Shopee, dan tombol WhatsApp otomatis berisi rincian nama barang, harga, dan tautan halaman.
- **Direktori Toko [`/toko`](http://localhost:4321/toko) & Profil Toko [`/toko/[id]`](http://localhost:4321/toko/1)**: Direktori unit usaha UMKM per MWC dengan lencana resmi `✓ Verified MWC NU`, etalase katalog milik toko, informasi lokasi, dan tombol chat langsung ke pemilik toko.
- **Kegiatan NU & Pasar Konsumsi [`/kegiatan`](http://localhost:4321/kegiatan) & [`/kegiatan/[slug]`](http://localhost:4321/kegiatan/lailatul-ijtima-mwc-gapura)**: Jadwal pengajian akbar, Lailatul Ijtima', dan Harlah se-Sumenep. Dilengkapi tombol pemesanan katering/snack box ke UMKM terdekat dan informasi pendaftaran lapak bazar warga.
- **Panduan Usaha & Edukasi [`/edukasi`](http://localhost:4321/edukasi) & [`/edukasi/[slug]`](http://localhost:4321/edukasi/sertifikasi-halal-gratis-sehati-umkm-sumenep)**: Artikel literasi ekonomi santri, panduan sertifikasi halal gratis (SEHATI BPJPH), dan akses permodalan syariah BMTNU / Lazisnu.
- **Produk Favorit [`/favorit`](http://localhost:4321/favorit)**: Penyimpanan produk favorit berbasis database Neon Postgres untuk pengguna terdaftar (SSR instan) serta sinkronisasi otomatis (*auto-sync*) dari `localStorage` browser pengguna tamu saat masuk/login.
- **Halaman Error Kustom [`/404`](http://localhost:4321/404)**, `sitemap.xml`, dan `robots.txt`.

### 2. Manajemen & Hak Akses (3 Core Roles & Single Identity)
Sistem menggunakan arsitektur *Role-Based Access Control* (RBAC) 3 peran inti yang bersih mengikuti best practice marketplace modern, di mana status penjual (*merchant*) berbasis kepemilikan relasi data toko (`user.umkm`), sehingga warga maupun kader dapat membuka toko tanpa bentrok role:
- **`superadmin`**: Akses penuh ke seluruh konsol administrasi [`/admin`](http://localhost:4321/admin), persetujuan kader, moderasi toko, dan kegiatan.
- **`petugas`**: Relawan/kader lapangan MWC penugasan pendataan jemput bola via [`/petugas`](http://localhost:4321/petugas) yang telah disetujui Superadmin.
- **`warga`**: Akun jamaah/warga umum. Berperan ganda secara alami: sebagai **Pembeli** (katalog & favorit) dan otomatis menjadi **Penjual (Merchant)** begitu mengisi profil toko di [`/dashboard`](http://localhost:4321/dashboard).

#### Rincian Halaman Pengelolaan:
- **Konsol Superadmin [`/admin`](http://localhost:4321/admin)**:
  - Panel persetujuan (*approval gate*) kader petugas lapangan MWC dengan aksi 1-klik Setujui / Tolak.
  - Moderasi toko UMKM: pemberian status verifikasi centang hijau resmi MWC NU dan penghapusan toko bermasalah.
  - Ringkasan statistik sistem: jumlah toko, produk aktif, perputaran kas, dan sebaran petugas per MWC.
  - Rute lama `/pengurus` otomatis dialihkan (302 redirect) ke `/admin`.
- **Portal Petugas Lapangan [`/petugas`](http://localhost:4321/petugas)**:
  - Antarmuka relawan kader MWC bersih dan bebas template usang OsClass.
  - Alur pendaftaran mandiri kader dengan pilihan MWC penugasan dan nomor WhatsApp.
  - Pencegahan duplikasi toko: otomatis mendeteksi nomor WhatsApp toko yang sudah ada sebelum membuat toko baru.
  - Kompresi foto kamera HP otomatis di browser menggunakan HTML5 Canvas untuk menghemat kuota internet kader.
  - Rute lama `/agen` otomatis dialihkan (302 redirect) ke `/petugas`.
- **Dashboard Toko Mandiri [`/dashboard`](http://localhost:4321/dashboard)**:
  - Autentikasi ganda via Neon Auth (Google Social Login & Email/Kata Sandi).
  - Pengaturan profil usaha: perbarui nama toko, WhatsApp aktif, zona MWC, dan alamat toko.
  - Manajemen etalase produk: tambah produk baru, edit nama/harga/kategori/deskripsi/foto, ubah status ketersediaan (*Tersedia / Habis*), sundul iklan (*bump to top*), dan hapus iklan.
  - **Buku Kas Penjualan Santri**:
    - Dropdown *Isi Cepat Produk* yang otomatis mengisi nama transaksi dan nominal harga barang.
    - Input tanggal transaksi mundur/kemarin (`transactionDate`).
    - **Ekspor Laporan Kas ke CSV (`.csv`)**: Tombol `📊 Unduh CSV` untuk mengekspor rekap pembukuan toko ke format Excel.
    - Klaim toko otomatis bagi pemilik toko hasil pendataan jemput bola lapangan.

### 3. Ekosistem & PWA
- Progressive Web App (PWA) via `public/manifest.webmanifest` untuk kemudahan instalasi di smartphone (*Add to Home Screen*).
- Konfigurasi aplikasi native Android via Capacitor (`capacitor.config.json`).
- Mobile bottom navigation 5 tombol ergonomis: Beranda, Favorit, Pasang Cepat, Toko Warga, dan Toko Saya/Admin.
- Penyimpanan media hybrid: Gambar produk ke CDN ImageKit (dengan fallback disk lokal), avatar ke Neon Object Storage S3 (dengan fallback disk lokal).

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

Untuk membuat tabel skema (termasuk kolom relasi petugas, toko, dan tabel favorit) serta mengisi data awal wilayah 27 MWC NU Sumenep:

```bash
node --env-file=.env scripts/migrate-neon.js
```

---

## 🛠️ Perintah npm

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Astro dev server interaktif |
| `npm run build` | Melakukan build produksi server & aset klien ke folder `dist/` |
| `npm run preview` | Melakukan pratinjau hasil build produksi |
| `npm start` | Menjalankan server Node.js dari hasil build produksi |
| `node --env-file=.env scripts/migrate-neon.js` | Menjalankan DDL migrasi dan seed database Neon Postgres |

---

## 🔑 Variabel Lingkungan

Seluruh konfigurasi lingkungan tersedia di [`.env.example`](./.env.example):

- **Server**: `HOST`, `PORT`, `SITE_URL`
- **Database**: `DATABASE_URL` (Koneksi pooling Neon Postgres)
- **Superadmin**: `SUPERADMIN_EMAIL` (Email pemilik akses penuh konsol `/admin`, contoh: `info.rasyiqi@gmail.com`)
- **Media CDN**: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
- **Autentikasi Neon**: `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`
- **Google OAuth Langsung (Legacy)**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Object Storage**: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Operasional**: `WHATSAPP_HELP` (Nomor pusat bantuan pengurus MWC/PCNU, format: `628xxxxxxxxxx`)

---

## 🚢 Panduan Deployment

### 1. VPS / Server Node.js Mandiri
```bash
npm run build
# Arahkan proses ke entry server
node --env-file=.env dist/server/entry.mjs
```

### 2. Vercel
1. Hubungkan repositori GitHub ke proyek baru di Vercel.
2. Tambahkan variabel lingkungan dari `.env.example` ke dashboard Vercel.
3. Vercel akan otomatis mendeteksi konfigurasi Astro (`@astrojs/vercel`) dan mendeploy fungsi serverless secara instan.

---

## 📁 Struktur Direktori

```
mamasar/
├── src/
│   ├── components/      # Komponen UI (ProductCard, PromoSlider)
│   ├── layouts/         # Layout utama, navigasi desktop/mobile, meta tags SEO
│   ├── lib/             # Schema Drizzle, database query helper (db.ts), auth, constants
│   ├── pages/           # Rute halaman publik & API endpoint (/admin, /petugas, /dashboard, dll.)
│   └── styles/          # Konfigurasi Tailwind CSS 4 & styling global
├── scripts/             # Skrip migrasi DDL & seed data Neon Postgres
├── public/              # Manifest PWA, favicon, ikon SVG resolusi tinggi
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
