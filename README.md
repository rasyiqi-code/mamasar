# Direktori Digital UMKM NU Sumenep (Pasar Warga NU)

Aplikasi direktori UMKM Nahdliyin Kabupaten Sumenep berbasis **Astro All-in-One** (Frontend + Backend API + Database SQLite). Didesain **Mobile-First**, 100% ramah SEO Google, dan siap dideploy langsung di hosting Node.js.

## Fitur Utama MVP
1. **Katalog Publik (Mobile-First):**
   - Filter wilayah teritorial MWC NU (MWC Kota, Gapura, Kalianget, Ambunten, dll.).
   - Sentimen *"Beli Produk Tetangga Warga Nahdliyin"*.
   - Grid produk 2 kolom responsif dengan badge status verifikasi NU.
2. **Halaman Detail Produk (100% SEO):**
   - High-priority LCP Hero Image (`fetchpriority="high"`).
   - Metadata Open Graph lengkap untuk tampilan tautan preview di WhatsApp & media sosial.
   - Schema.org Structured Data (`Product` & `LocalBusiness`) untuk Google Search rich snippets.
   - **Sticky Bottom WhatsApp CTA:** Satu klik langsung membuka pesan WhatsApp terstruktur ke pemilik UMKM dengan tautan produk.
3. **Form Entri Cepat Agen Lapangan (`/agen`):**
   - Kompresi foto otomatis di sisi klien (Canvas) dari foto kamera HP (8MB ➔ ~150KB) sebelum dikirim, hemat kuota di pelosok.
   - Form ringkas (<90 detik per produk).
   - Opsi *Simpan & Tambah Varian Produk Toko Ini* untuk input multi-produk toko tanpa mengulang identitas usaha.
4. **Database & API Terintegrasi:**
   - Database SQLite lokal (`data/mamasar.db`) via `better-sqlite3`.
   - Endpoint REST API (`/api/products`) langsung ditangani oleh Astro di server Node.js.

---

## Menjalankan di Komputer Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan mode development
npm run dev
# Akses di: http://localhost:4321
```

---

## Panduan Deploy ke Hosting Node.js (cPanel / Server)

### 1. Build Proyek
```bash
npm run build
```
Proses ini akan menghasilkan folder `dist/` dengan entry point server di `dist/server/entry.mjs`.

### 2. Konfigurasi di cPanel ("Setup Node.js App")
- **Node.js version:** Pilih versi Node.js yang tersedia (disarankan 20.x atau 22.x).
- **Application root:** Direktori folder aplikasi Anda (misal: `/public_html` atau `/umkm`).
- **Application startup file:** `dist/server/entry.mjs`
- **Application URL:** Domain / subdomain Anda (misal: `umkm.nusumenep.or.id`).

Klik **Create / Restart**, dan aplikasi langsung aktif!

---

## Dokumentasi & Roadmap Pengembangan

Untuk panduan teknis mendalam dan spesifikasi modul, rujuk dokumen berikut:

- 🗺️ **[ROADMAP.md](./ROADMAP.md)**: Rencana kerja bertahap (Fase 1 hingga Fase 5) menuju aplikasi utuh.
- ☁️ **[DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md](./DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md)**: Arsitektur Cloud (Vercel + Neon Postgres + ImageKit + Google Auth - Rp 0/bln).
- 📱 **[DOCS/ANDROID_CAPACITOR.md](./DOCS/ANDROID_CAPACITOR.md)**: Panduan rilis aplikasi Android (.apk/.aab) via Capacitor & PWA.
- 🗄️ **[DOCS/DATABASE.md](./DOCS/DATABASE.md)**: Skema tabel Neon PostgreSQL & SQLite (`users`, `umkm`, `products`, `articles`, `events`).
- 🍲 **[DOCS/PASAR_KEGIATAN_NU.md](./DOCS/PASAR_KEGIATAN_NU.md)**: Konsep bisnis & alur *Pasar Kegiatan NU* (Pusat Konsumsi Acara Panitia & Lapak Warga).
- ⚙️ **[.env.example](./.env.example)**: Template variabel lingkungan untuk konfigurasi server & keamanan agen.

---

## Agenda Fitur Selanjutnya (Work in Progress)

Berdasarkan rencana kerja di [ROADMAP.md](./ROADMAP.md):

1. **Validasi Nomor WhatsApp Otomatis** (Regex Indonesia di form agen dan API).
2. **Menu Edukasi Lengkap** (`/edukasi`): Panduan Ekonomi Pekarangan, Usaha Santri, dan Sertifikasi Halal.
3. **Banner Slider Interaktif** di beranda untuk promosi agenda warga & produk unggulan.
4. **Fitur Naikkan Iklan (*Sundul / Bump*)** agar produk kembali ke posisi teratas katalog.
5. **Direktori Kegiatan NU & Banom** sebagai pasar konsumsi (katering/snack acara) dan lapak bazar jamaah.
6. **Portal Manajemen Agen Lapangan** (`/agen/kelola`) untuk menandai produk habis atau mengedit harga.
7. **Rilis Aplikasi Android (.apk/.aab)** via Capacitor & PWA untuk kemudahan warga.
