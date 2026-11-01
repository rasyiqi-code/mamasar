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
