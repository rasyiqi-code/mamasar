# Direktori Digital UMKM NU Sumenep (Pasar Warga NU)

Aplikasi direktori UMKM Nahdliyin Kabupaten Sumenep. Dibangun dengan Astro (SSR), Tailwind CSS 4, dan `better-sqlite3` untuk data lokal. Integrasi Neon (Postgres, Auth, Object Storage) dan ImageKit tersedia untuk deployment cloud. Tampilan mobile-first, halaman produk ramah SEO, dan konversi langsung ke WhatsApp.

## Fitur yang berjalan

### Halaman publik
- **Beranda `/`**: katalog produk dengan filter zona MWC (`zona`), kategori (`kategori`), pencarian (`q`), dan urutan (`sort`: `newest`, `price_asc`, `price_desc`). Empat produk teratas tampil di blok "Pilihan Premium".
- **Detail produk `/p/[slug]`**: metadata Open Graph, Schema.org `Product`, penghitung tampilan dengan cookie debounce, status stok, tautan Shopee (jika diisi), dan tombol WhatsApp berisi nama produk, harga, wilayah, serta tautan halaman.
- **Direktori toko `/toko` dan `/toko/[id]`**: daftar toko per zona dengan jumlah produk dan sampel foto.
- **Kegiatan NU `/kegiatan` dan `/kegiatan/[slug]`**: agenda kegiatan, kebutuhan konsumsi, status lapak bazar, kontak koordinator via WhatsApp, dan rekomendasi kuliner dari MWC yang sama.
- **Edukasi `/edukasi` dan `/edukasi/[slug]`**: artikel panduan usaha dan tautan referensi video.
- **Favorit `/favorit`**: daftar produk yang disimpan di `localStorage`.
- **Halaman 404**, `sitemap.xml`, dan `robots.txt`.

### Manajemen
- **Portal agen `/agen`**: entri produk cepat dengan PIN agen. Foto dikompresi di browser memakai Canvas sebelum dikirim.
- **Dashboard UMKM `/dashboard`**: login Neon Auth (Google atau email/password) atau mode demo, penyiapan profil toko, unggah/edit/hapus produk, ubah status stok, sundul iklan, dan buku kas penjualan.
- **API internal**: lihat [DOCS/API.md](./DOCS/API.md).

### Platform
- Adapter Vercel otomatis saat `VERCEL` terdeteksi, fallback ke adapter Node standalone untuk hosting biasa.
- PWA (`public/manifest.webmanifest`) dan konfigurasi Capacitor Android (`capacitor.config.json`).
- Endpoint health check layanan Neon di `/api/neon/services`.
- Penyimpanan foto produk ke ImageKit dengan fallback ke disk lokal. Foto profil ke Neon Object Storage dengan fallback ke disk lokal.

---

## Menjalankan di komputer lokal

```bash
npm install
cp .env.example .env
npm run dev
```

Akses `http://localhost:4321`. `src/lib/db.ts` membuat `data/mamasar.db` dan menjalankan seed otomatis saat tabel `zones` atau `products` masih kosong.

## Perintah npm

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Jalankan Astro dev server |
| `npm run build` | Build ke `dist/` (entry server: `dist/server/entry.mjs`) |
| `npm run preview` | Pratinjau hasil build |
| `npm start` | Jalankan server hasil build |
| `npm run seed` | Seed SQLite tanpa menghapus data yang ada |
| `npm run seed:reset` | Reset dan seed ulang SQLite |
| `npm run backup` | Backup atomik `data/mamasar.db` ke `data/backups/`, simpan 7 arsip terakhir |
| `npx astro dev --background` | Jalankan dev server di latar belakang, kelola dengan `astro dev stop`, `astro dev status`, `astro dev logs` |

Migrasi skema dan seed Neon Postgres:

```bash
DATABASE_URL="postgresql://..." node scripts/migrate-neon.js
```

`scripts/migrate-neon.js` dan `scripts/seed.js` mengimpor `src/lib/seeds.ts` secara langsung. Gunakan Node 22.18+ atau Node 24 yang mendukung type stripping TypeScript bawaan.

## Variabel lingkungan

Semua variabel ada di [.env.example](./.env.example). Kelompok utamanya:

- **Server**: `HOST`, `PORT`, `SITE_URL`
- **Database**: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_DIR`, `DATABASE_NAME`
- **Media**: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
- **Google OAuth langsung (legacy)**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Neon Auth**: `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`
- **Neon Object Storage**: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Neon Functions/Realtime (opsional)**: `NEON_BRANCH_ID`, `NEON_FUNCTION_HOST_SUFFIX`, `NEON_REALTIME_SECRET`, `NEON_REALTIME_URL`
- **Sesi dan operasional**: `SESSION_SECRET`, `AGENT_PIN`, `WHATSAPP_HELP`

Catatan: `DATABASE_DIR`, `DATABASE_NAME`, `DATABASE_URL_UNPOOLED`, `SITE_URL`, dan `SESSION_SECRET` belum dibaca langsung oleh kode aplikasi saat ini. Penjelasan status tiap variabel ada di [DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md](./DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md).

## Deploy

### Hosting Node.js (cPanel atau VPS)
1. Jalankan `npm run build`.
2. Arahkan startup file ke `dist/server/entry.mjs`.
3. Isi variabel lingkungan dari `.env.example`.

### Vercel
1. Import repositori ke Vercel.
2. Tambahkan environment variables produksi.
3. Adapter Vercel dipilih otomatis karena `process.env.VERCEL` terisi saat build.

Penting: semua operasi baca/tulis aplikasi masih memakai SQLite. Di Vercel, `src/lib/db.ts` menaruh database di `/tmp`, sehingga data dapat hilang saat instance serverless didaur ulang. Untuk data persisten, pindahkan lapisan CRUD ke Neon Postgres. Rincian ada di dokumen infrastruktur.

## Struktur proyek

```
src/
  components/     Komponen UI (ProductCard, filter, slider)
  layouts/        Layout global, meta SEO, PWA
  lib/            Database, seed, auth, storage, konstanta, util
  pages/          Rute halaman dan endpoint API
  styles/         Tailwind dan gaya global
scripts/          seed.js, migrate-neon.js, backup.js
data/             SQLite, upload lokal, arsip backup
DOCS/             Dokumentasi teknis
public/           Manifest PWA, ikon, aset statis
```

## Dokumentasi

- [ROADMAP.md](./ROADMAP.md): rencana dan status per fase.
- [Plan.md](./Plan.md): PRD MVP dan batasan lingkup.
- [DOCS/API.md](./DOCS/API.md): referensi endpoint API.
- [DOCS/DATABASE.md](./DOCS/DATABASE.md): skema SQLite dan Neon Postgres.
- [DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md](./DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md): arsitektur cloud dan status integrasi.
- [DOCS/ANDROID_CAPACITOR.md](./DOCS/ANDROID_CAPACITOR.md): rilis Android dan PWA.
- [DOCS/PASAR_KEGIATAN_NU.md](./DOCS/PASAR_KEGIATAN_NU.md): konsep dan implementasi Pasar Kegiatan NU.
- [.env.example](./.env.example): template variabel lingkungan.
