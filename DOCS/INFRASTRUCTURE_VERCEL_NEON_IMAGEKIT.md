# Arsitektur Cloud & Infrastruktur: Vercel + Neon + ImageKit + Google Auth

Dokumen ini mendefinisikan spesifikasi arsitektur produksi modern untuk **Pasar Warga NU Sumenep** agar memiliki ketahanan data 100% (*anti-data loss saat redeploy*), performa tinggi, dan biaya operasional **Rp 0 (100% Free Tier Permanen)**.

---

## 🏗️ Diagram Arsitektur Cloud

```mermaid
flowchart TD
    User["📱 Pengunjung / Pembeli / Agen (HP & Desktop)"] --> Vercel["⚡ Vercel Edge Network & Serverless\n(Hosting Astro SSR)\n- 100 GB Bandwidth\n- 1.000.000 Invocations\n- Domain: umkm.nusumenep.or.id"]
    
    subgraph CloudServices ["Layanan Cloud Terdistribusi (Rp 0 / Bulan)"]
        Neon["🐘 Neon Serverless PostgreSQL\n(Database Utama)\n- Skema Relasional (Toko, Produk, User, Event)\n- Scale-to-Zero & Auto Wake-up (<1s)\n- TIDAK PERNAH DI-PAUSE"]
        ImageKit["🖼️ ImageKit.io\n(Storage & CDN Foto Produk)\n- 3 GB Media Storage (~20.000 Foto)\n- 20 GB CDN Bandwidth\n- Transformasi WebP Realtime Gratis"]
        Google["🔐 Google Cloud OAuth 2.0\n(Login Mandiri UMKM)\n- 1-Klik Masuk dengan Google\n- Profil Terverifikasi Warga"]
    end

    Vercel -->|Query Data SQL| Neon
    Vercel -->|Upload & Fetch Foto| ImageKit
    Vercel -->|Verifikasi Token Sesi| Google
```

---

## 📊 Matriks Alokasi & Batasan Kuota Free Tier

| Layanan | Peran Sistem | Kapasitas Gratis per Bulan | Toleransi Beban Pasar Warga NU |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hosting & SSR App | • 100 GB Bandwidth<br>• 1.000.000 Panggilan Fungsi<br>• 100 Deploy/hari | Sanggup melayani **~33.000 kunjungan per hari** tanpa biaya. |
| **Neon** | Database PostgreSQL | • 0.5 GiB Storage Data<br>• Autoscaling Compute<br>• Branching DB | Menampung **50.000+ produk & profil toko**. Auto wake-up instan, tidak pernah mati/pause. |
| **ImageKit.io** | Storage & CDN Foto | • 3 GB Media Storage<br>• 20 GB CDN Bandwidth<br>• **Unlimited Transformasi** | Menampung **~20.000 foto produk HP terkompresi** dan 600.000+ view gambar per bulan. |
| **Google Cloud** | Autentikasi Pengguna | • Kuota OAuth Standar Google | Tidak terbatas untuk skala login pengguna umum. |

---

## ⚙️ Rincian Komponen & Integrasi Teknis

### 1. Vercel Hosting (Astro Adapter)
* **Paket Adapter:** `@astrojs/vercel`
* **Strategi Efisiensi:**
  * File HTML dan JSON API dirender oleh Vercel Serverless Function.
  * Semua aset gambar produk **tidak disimpan di Vercel**, melainkan langsung dialirkan dari ImageKit CDN. Ini menjaga penggunaan bandwidth Vercel tetap sangat kecil (~15–20 KB per request).
* **Domain & Keamanan:**
  * Domain kustom: `umkm.nusumenep.or.id` (otomatis gratis SSL Let's Encrypt dari Vercel).
  * Proteksi DDoS bawaan Vercel Edge Network.

### 2. Neon Serverless PostgreSQL
* **Alasan Pemilihan:** Mengatasi kelemahan Supabase (yang mem-pause database jika tidak ada traffic 7 hari). Neon **selalu aktif**, otomatis tidur saat sepi dan otomatis bangun dalam ~500 milidetik saat ada request masuk.
* **Driver Penghubung:** `@neondatabase/serverless` atau `postgres` (porsgres-js).
* **Koneksi:** Menggunakan connection pooling URL untuk menjamin performa serverless tanpa kehabisan batas koneksi (*connection exhaustion*).

### 3. ImageKit.io (Media Delivery & Storage)
* **Alasan Pemilihan:**
  * Berbeda dari Cloudinary yang menggunakan sistem kredit gabungan (storage memakan kuota bandwidth) dan upgrade berbayar mahal ($89/bln), ImageKit memisahkan kuota secara transparan (3 GB Storage + 20 GB Bandwidth) dan memiliki opsi upgrade terjangkau ($9/bln).
  * **Transformasi URL Real-time Gratis Tanpa Batas:**
    ```html
    <!-- Contoh pemanggilan foto di template: otomatis resize & format WebP super cepat -->
    <img src="https://ik.imagekit.io/mamasar/prod-123.jpg?tr=w-400,h-300,fo-auto,q-80,f-webp" />
    ```
* **Alur Unggah:**
  1. Pengguna memilih/memotret foto di HP.
  2. Kompresi otomatis di sisi browser (HTML5 Canvas) mereduksi ukuran dari ~8 MB menjadi ~120 KB.
  3. Form mengirim base64/file ke endpoint `/api/upload` Astro.
  4. Server Astro mengunggah file ke ImageKit via REST API / SDK ImageKit dan menyimpan URL CDN ke database Neon.

### 4. Google OAuth 2.0 (Login Mandiri UMKM)
* **Alur Login:**
  1. Pemilik UMKM mengklik tombol *"Masuk dengan Google"*.
  2. Pengguna dialihkan ke halaman izin akun Google: `https://accounts.google.com/o/oauth2/v2/auth`.
  3. Google mengembalikan kode otorisasi ke endpoint `/api/auth/callback/google`.
  4. Server Astro menukar kode dengan profil Google pengguna (`google_id`, `email`, `name`, `avatar_url`).
  5. Sistem mencari atau membuat baris data di tabel `users` Neon, lalu menerbitkan cookie sesi (*HTTP-Only, Secure, SameSite*).
  6. Pengguna diarahkan ke `/dashboard` untuk mulai mengunggah atau mengedit produk mereka.

---

## 🔒 Variabel Lingkungan Produksi (Vercel Environment Variables)

Seluruh kunci rahasia disimpan di Vercel Dashboard (*Project Settings > Environment Variables*):

```env
# URL Publik
SITE_URL=https://umkm.nusumenep.or.id

# Database Neon (PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/mamasar?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/mamasar?sslmode=require

# ImageKit.io
IMAGEKIT_PUBLIC_KEY=public_xxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/mamasar

# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_REDIRECT_URI=https://umkm.nusumenep.or.id/api/auth/callback/google

# Sesi & Keamanan
SESSION_SECRET=super_secret_random_string_32_characters
AGENT_PIN=1926
```

---

## 💰 Estimasi Biaya Operasional Bulanan

| Layanan | Biaya Bulanan |
| :--- | :--- |
| **Hosting Vercel** | **Rp 0** |
| **Database Neon PostgreSQL** | **Rp 0** |
| **Storage & CDN Foto ImageKit.io** | **Rp 0** |
| **Autentikasi Google Cloud** | **Rp 0** |
| **Sertifikat SSL (HTTPS)** | **Rp 0** |
| **TOTAL BIAYA INFRASTRUKTUR** | **Rp 0 / Bulan** |
