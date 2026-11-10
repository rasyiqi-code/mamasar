# Arsitektur Cloud & Infrastruktur: Vercel + Neon + ImageKit

Dokumen ini menjelaskan arsitektur produksi **Pasar Warga NU Sumenep**, layanan yang sudah terhubung ke kode, dan batasan yang perlu diketahui sebelum deploy.

---

## Status integrasi di codebase

| Komponen | Status | Bukti di repositori |
| :--- | :--- | :--- |
| Vercel adapter | Aktif otomatis saat `VERCEL` terisi | `astro.config.mjs` memilih `@astrojs/vercel`; fallback ke `@astrojs/node` |
| Neon Postgres | Skema, seed, dan health check tersedia. CRUD aplikasi masih SQLite | `scripts/migrate-neon.js`, `src/lib/neon.ts`, `/api/neon/services` |
| Neon Auth | Aktif untuk Google dan email/password | `src/lib/neon-auth.ts`, `/api/auth/login`, `/api/auth/email`, `/api/auth/callback/neon` |
| ImageKit | Aktif untuk foto produk, fallback ke disk lokal | `src/lib/storage.ts` (`saveProductImage`) |
| Neon Object Storage (S3) | Aktif untuk foto profil, fallback ke disk lokal | `src/lib/storage.ts` (`saveAccountAvatar`), bucket `assets` |
| Neon Functions | Hanya dipanggil endpoint health check | `invokeNeonFunction()` di `src/lib/neon.ts` |
| Neon Realtime | Hanya diuji endpoint health check | `sealRealtimeQuery()` di `src/lib/neon.ts` |
| Google OAuth langsung | Endpoint legacy, tidak dipakai alur login utama | `/api/auth/callback/google` |
| PWA dan Capacitor | Aktif | `public/manifest.webmanifest`, `capacitor.config.json` |

---

## Diagram arsitektur

```mermaid
flowchart TD
    User["Pengunjung, pembeli, agen, pemilik UMKM"] --> Vercel["Vercel Edge Network & Serverless\nAstro SSR\nDomain: umkm.nusumenep.or.id"]

    subgraph Cloud["Layanan cloud"]
    NeonDB["Neon Postgres\nSkema, seed, health check, CRUD aplikasi"]
    NeonAuth["Neon Auth\nGoogle dan email/password"]
    ImageKit["ImageKit.io\nFoto produk dan CDN"]
    NeonS3["Neon Object Storage\nBucket assets untuk avatar"]
    NeonFn["Neon Functions dan Realtime\nProbe opsional"]
    end

    Vercel -->|CRUD aplikasi (Drizzle ORM)| NeonDB
    Vercel -->|Migrasi dan health check| NeonDB
    Vercel -->|Login dan sesi| NeonAuth
    Vercel -->|Upload foto produk| ImageKit
    Vercel -->|Upload avatar| NeonS3
    Vercel -->|Probe| NeonFn
```

---

## 1. Vercel Hosting

- Adapter dipilih otomatis: `@astrojs/vercel` saat `process.env.VERCEL` ada, selain itu `@astrojs/node` mode standalone.
- Semua halaman dan API dirender server-side (`output: 'server'`).
- Aset statis dilayani dari `public/` dan hasil build Vercel.
- Domain kustom dan SSL diatur di dashboard Vercel.

---

## 2. Lapisan database

### Yang dipakai aplikasi saat ini

`src/lib/db.ts` memakai Drizzle ORM (`drizzle-orm/neon-http`) di atas driver `@neondatabase/serverless` dengan `DATABASE_URL`:

- Semua CRUD aplikasi (produk, toko, akun, sesi, artikel, kegiatan, buku kas) berjalan di Neon PostgreSQL.
- Definisi tabel ada di `src/lib/schema.ts` (mirror dari DDL `scripts/migrate-neon.js`).
- Data persisten di semua lingkungan, termasuk serverless Vercel.
- `scripts/migrate-neon.js` membuat skema dan melakukan seed ke Neon Postgres.
- `/api/neon/services` mengecek koneksi Postgres, object storage, functions, auth, dan realtime (digerbang PIN).
- `src/lib/neon.ts` menyediakan client `neon()` dan helper lain.

---

## 3. Neon Auth

Alur yang dipakai dashboard:

1. **Google**: pengguna membuka `/api/auth/login`. Endpoint memanggil Neon Auth `/sign-in/social` dengan provider `google` dan `callbackURL` ke `/api/auth/callback/neon`.
2. **Email/password**: form dashboard mengirim `POST /api/auth/email` dengan `action` bernilai `signin` atau `signup`. Endpoint meneruskan ke Neon Auth `/sign-in/email` atau `/sign-up/email`.
3. **Callback**: `/api/auth/callback/neon` memverifikasi sesi lewat `/get-session`, menyinkronkan pengguna ke tabel `users` dengan `google_id = neon_<id>`, lalu membuat baris `sessions` lokal dan cookie `mamasar_session`.
4. **Resolusi sesi**: `resolveUser()` di `src/lib/neon-auth.ts` memeriksa cookie `mamasar_session` lebih dulu, lalu cookie Neon Auth (`__Secure-neon-auth.session_token`, `neon_auth.session_token`, atau `better-auth.session_token`).
5. **Logout**: `/api/auth/logout` menghapus sesi lokal, memanggil `/sign-out` Neon Auth, dan menghapus cookie terkait.

Endpoint Google OAuth langsung di `/api/auth/callback/google` masih ada untuk kompatibilitas. Endpoint ini memerlukan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REDIRECT_URI`, tetapi alur login utama sekarang lewat Neon Auth.

---

## 4. ImageKit.io untuk foto produk

Alur unggah:

1. Pengguna memilih atau memotret foto. Form agen dan dashboard mengompresi gambar di browser dengan Canvas.
2. Form mengirim `image` atau `imageBase64` ke `/api/products` atau `/api/umkm/add-product`.
3. `saveProductImage()` mengunggah buffer ke ImageKit folder `/products` bila kredensial tersedia.
4. Bila ImageKit gagal atau belum dikonfigurasi, file ditulis ke `data/uploads/` dan disajikan lewat `/uploads/[...path]`.
5. URL hasil disimpan di `products.image_url`.

Transformasi gambar dapat ditambahkan pada URL ImageKit, misalnya `?tr=w-400,h-300,fo-auto,q-80,f-webp`.

---

## 5. Neon Object Storage untuk foto profil

- `saveAccountAvatar()` mengunggah ke bucket `assets` dengan prefix `avatars/`.
- URL yang dikembalikan berupa presigned GET URL (default 7 hari) dari `getNeonPresignedUrl()`.
- Bila kredensial S3 belum diisi, file disimpan ke `data/uploads/avatars/`.
- Endpoint: `POST /api/user/avatar`.

Catatan: presigned URL kedaluwarsa. Untuk avatar yang dipakai jangka panjang, simpan URL publik atau perpanjang masa berlaku sesuai kebutuhan.

---

## 6. Neon Functions dan Realtime

Keduanya belum dipakai untuk fitur aplikasi. `/api/neon/services` hanya memanggil:

- `invokeNeonFunction('hello')`
- `sealRealtimeQuery('SELECT id, name, price FROM products LIMIT 3')`

Gunakan endpoint ini untuk memverifikasi konfigurasi setelah deploy.

---

## 7. Variabel lingkungan

Isi variabel di dashboard Vercel atau file `.env` lokal.

| Variabel | Wajib | Dibaca oleh | Keterangan |
| :--- | :--- | :--- | :--- |
| `HOST` | Tidak | Runtime Astro Node | Alamat bind server |
| `PORT` | Tidak | Runtime Astro Node | Port server lokal |
| `SITE_URL` | Tidak | Belum dibaca kode | URL canonical dihitung dari request |
| `DATABASE_URL` | Untuk Neon | `src/lib/neon.ts`, `scripts/migrate-neon.js` | Connection string pooler Neon |
| `DATABASE_URL_UNPOOLED` | Tidak | Belum dibaca kode | Disiapkan untuk migrasi langsung |
| `IMAGEKIT_PUBLIC_KEY` | Untuk ImageKit | `src/lib/storage.ts` | Public key ImageKit |
| `IMAGEKIT_PRIVATE_KEY` | Untuk ImageKit | `src/lib/storage.ts` | Private key ImageKit |
| `IMAGEKIT_URL_ENDPOINT` | Untuk ImageKit | `src/lib/storage.ts` | Endpoint CDN ImageKit |
| `GOOGLE_CLIENT_ID` | Untuk OAuth legacy | `/api/auth/callback/google` | Client ID Google |
| `GOOGLE_CLIENT_SECRET` | Untuk OAuth legacy | `/api/auth/callback/google` | Client secret Google |
| `GOOGLE_REDIRECT_URI` | Untuk OAuth legacy | `/api/auth/callback/google` | Redirect URI |
| `NEON_AUTH_BASE_URL` | Untuk Neon Auth | `src/lib/neon-auth.ts` | Base URL Neon Auth |
| `NEON_AUTH_JWKS_URL` | Tidak | `/api/neon/services` | Dicek di health report |
| `AWS_ENDPOINT_URL_S3` | Untuk avatar S3 | `src/lib/neon.ts` | Endpoint S3 Neon |
| `AWS_ACCESS_KEY_ID` | Untuk avatar S3 | `src/lib/neon.ts` | Access key |
| `AWS_SECRET_ACCESS_KEY` | Untuk avatar S3 | `src/lib/neon.ts` | Secret key |
| `AWS_REGION` | Tidak | `src/lib/neon.ts` | Default `ap-southeast-1` |
| `NEON_BRANCH_ID` | Tidak | `src/lib/neon.ts` | Default branch untuk functions |
| `NEON_FUNCTION_HOST_SUFFIX` | Tidak | `src/lib/neon.ts` | Suffix host functions |
| `NEON_REALTIME_SECRET` | Untuk Realtime | `src/lib/neon.ts` | Secret seal query |
| `NEON_REALTIME_URL` | Tidak | `/api/neon/services` | Hanya dilaporkan |
| `AGENT_PIN` | Ya untuk produksi | `/api/products`, endpoint produk lain | PIN agen lapangan |
| `WHATSAPP_HELP` | Tidak | `src/lib/constants.ts` | Nomor helpdesk PCNU |

Contoh blok `.env` produksi:

```env
SITE_URL=https://umkm.nusumenep.or.id

DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require

IMAGEKIT_PUBLIC_KEY=public_xxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/mamasar

NEON_AUTH_BASE_URL=https://ep-sample.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth
NEON_AUTH_JWKS_URL=https://ep-sample.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json

AWS_ENDPOINT_URL_S3=https://<endpoint-object-storage-neon>
AWS_ACCESS_KEY_ID=xxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxx
AWS_REGION=ap-southeast-1

AGENT_PIN=1926
WHATSAPP_HELP=6281234567890
```

---

## 8. Health check

Setelah deploy, buka:

```
GET /api/neon/services
```

Respons berisi status `postgres`, `object_storage`, `functions`, `auth`, dan `realtime`. Endpoint ini tidak memerlukan login dan memberi respons JSON tanpa cache.

---

## 9. Estimasi biaya

| Layanan | Biaya bulanan |
| :--- | :--- |
| Hosting Vercel | Rp 0 pada free tier |
| Neon Postgres | Rp 0 pada free tier |
| Neon Auth | Rp 0 pada free tier |
| Neon Object Storage | Sesuai kuota paket Neon |
| ImageKit.io | Rp 0 pada free tier |
| Sertifikat SSL | Rp 0 |

Kuota free tier berubah dari waktu ke waktu. Periksa dashboard masing-masing layanan sebelum mengandalkan angka kapasitas tertentu.
