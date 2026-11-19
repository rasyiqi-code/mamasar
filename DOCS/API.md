# Referensi API

Seluruh backend API dibangun di atas arsitektur performa tinggi **Elysia.js** yang dimuat melalui rute catch-all Astro SSR (`src/client/pages/api/[...slugs].ts` mendelegasikan ke `src/server/index.ts`). Format respons standar adalah JSON. Autentikasi menggunakan cookie `mamasar_session` (HttpOnly, SameSite=Lax, Secure di HTTPS, berlaku 30 hari) yang disinkronkan setelah login Neon Auth (Better Auth) atau login Google legacy.

---

## Ringkasan endpoint

| Metode | Path | Autentikasi | Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Publik | Health check metadata runtime & framework Elysia |
| `GET` | `/api/auth/login` | Publik | Inisiasi login Google OAuth via Neon Auth |
| `POST` | `/api/auth/email` | Publik | Sign in atau sign up email & password via Neon Auth |
| `GET` | `/api/auth/callback/neon` | Publik | Callback Neon Auth, sinkronisasi pengguna & sesi |
| `GET` | `/api/auth/callback/google` | Publik | Callback Google OAuth langsung (legacy) |
| `ALL` | `/api/auth/logout` | Cookie | Hapus sesi lokal dan sesi Neon Auth |
| `POST` | `/api/petugas/register` | Sesi | Pendaftaran mandiri kader pendata lapangan MWC |
| `POST` | `/api/admin/petugas/action` | PCNU / Superadmin | Persetujuan / penolakan pendaftaran kader lapangan |
| `POST` | `/api/admin/users/role` | PCNU / Superadmin | Penugasan peran pengguna (PCNU, MWCNU, Ranting, Warga) & zona tugas |
| `GET` | `/api/admin/articles` | PCNU / Superadmin | Ambil daftar artikel panduan edukasi untuk panel admin |
| `POST` | `/api/admin/articles` | PCNU / Superadmin | Publikasi atau pembaruan artikel edukasi |
| `DELETE`| `/api/admin/articles/:id` | PCNU / Superadmin | Hapus artikel edukasi |
| `POST` | `/api/admin/case-studies` | PCNU / Superadmin | Tambah atau perbarui video studi kasus UMKM |
| `DELETE`| `/api/admin/case-studies/:id`| PCNU / Superadmin | Hapus video studi kasus |
| `POST` | `/api/products` | Sesi login | Buat UMKM baru beserta produk pertama (kader lapangan) |
| `POST` | `/api/products/bump` | Pemilik toko | Naikkan produk ke urutan teratas (*sundul iklan*) |
| `POST` | `/api/products/delete` | Pemilik toko | Hapus produk |
| `POST` | `/api/products/toggle-stock` | Pemilik toko | Ubah status stok (*Tersedia / Habis*) |
| `POST` | `/api/umkm/setup` | Sesi toko | Simpan atau perbarui profil toko, logo, ranting, dan legalitas |
| `POST` | `/api/umkm/add-product` | Sesi toko | Tambah produk baru (didukung galeri multi-foto hingga 4 foto) |
| `POST` | `/api/umkm/verify` | Pengurus MWC | Berikan atau cabut status centang hijau terverifikasi toko |
| `POST` | `/api/umkm/delete` | Pengurus MWC | Hapus toko beserta katalog produknya |
| `GET` | `/api/favorites/list` | Publik | Ambil daftar produk favorit berdasarkan array ID (mode tamu) |
| `POST` | `/api/favorites/toggle` | Sesi / Tamu | Simpan atau hapus produk dari daftar favorit |
| `POST` | `/api/favorites/sync` | Sesi | Sinkronisasi daftar favorit lokal tamu ke database pengguna login |
| `POST` | `/api/promotions/order` | Sesi toko | Pemesanan slot iklan unggulan / promosi |
| `POST` | `/api/promotions/review` | PCNU / MWCNU | Persetujuan atau penolakan pengajuan promosi produk |
| `POST` | `/api/events` | PCNU / MWCNU | Buat, ubah, atau hapus agenda kegiatan (terisolasi zona MWC) |
| `POST` | `/api/events/order` | Publik | Ajukan pesanan konsumsi atau pendaftaran lapak bazar acara NU |
| `PATCH` | `/api/events/order` | PCNU / MWCNU | Perbarui status pesanan konsumsi / lapak (`pending`/`contacted`/`approved`/`rejected`) |
| `POST` | `/api/user/avatar` | Sesi opsional | Unggah foto profil pengguna ke Neon S3 / disk lokal |
| `POST` | `/api/user/cashbook` | Sesi | Tambah catatan transaksi pemasukan/pengeluaran buku kas |
| `DELETE`| `/api/user/cashbook` | Sesi | Hapus catatan transaksi buku kas |
| `GET` | `/api/user/export` | Sesi | Unduh ekspor data pribadi (akun, toko, produk, & kas) format JSON (UU PDP) |
| `POST` | `/api/user/delete-account` | Sesi | Hapus permanen akun & etalase UMKM milik sendiri |
| `GET/POST`| `/api/cron/expire-promotions`| Cron Secret | Cron job untuk mengakhiri masa aktif promosi produk yang telah kedaluwarsa |
| `GET` | `/api/neon/services` | Sesi | Health check diagnostik ekosistem Neon Cloud |
| `GET` | `/uploads/[...path]` | Publik | Sajikan file lokal dari `data/uploads` bila ImageKit offline |
| `GET` | `/sitemap.xml` | Publik | Generator sitemap dinamis |
| `GET` | `/robots.txt` | Publik | Pengaturan crawler mesin pencari |

---

## Autentikasi

### `GET /api/auth/login`

Mengarahkan pengguna ke Google OAuth melalui Neon Auth (Better Auth).

Alur Neon Auth:

1. Endpoint memanggil `${NEON_AUTH_BASE_URL}/sign-in/social`.
2. Header: `Origin: <origin>` (Domain origin harus terdaftar di *Trusted Origins* Neon Auth, contoh: `https://mamasar.com`).
3. Body: `{"provider":"google","callbackURL":"<origin>/api/auth/callback/neon"}`.
4. Respons: URL otorisasi Google OAuth (`data.url`). Pengguna dialihkan dengan status HTTP 302.
5. Bila gagal inisiasi, pengguna dialihkan kembali ke `/login?error=neon_auth_init_failed` dan antarmuka menampilkan pesan ramah pengguna.

### `POST /api/auth/email`

Menerima `application/json` atau form.

| Field | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `action` | string | Tidak | `signin` (default) atau `signup` |
| `email` | string | Ya | Email pengguna |
| `password` | string | Ya | Kata sandi. Form dashboard memakai `minlength=8` |
| `name` | string | Untuk signup | Nama tampilan |

Endpoint meneruskan permintaan ke Neon Auth, lalu menyinkronkan user ke tabel `users`, membuat sesi lokal, dan mengembalikan cookie.

Respons sukses:

```json
{
  "ok": true,
  "user": { "id": 1, "email": "warga@example.com", "name": "Warga NU" },
  "redirect": "/dashboard"
}
```

Respons gagal: `400` dengan `{ "ok": false, "error": "..." }`, atau `500` bila Neon Auth tidak dapat dihubungi.

### `GET /api/auth/callback/neon`

Memverifikasi sesi Neon Auth lewat `/get-session`, menyinkronkan user, membuat sesi lokal, lalu redirect ke `/dashboard`. Bila gagal, redirect ke `/dashboard?error=<kode>`.

### `GET /api/auth/callback/google`

Alur OAuth Google langsung. Memerlukan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REDIRECT_URI`. Menukar `code` menjadi token, mengambil profil dari Google UserInfo, lalu membuat sesi lokal.

Alur login utama tidak memakai endpoint ini.

### `ALL /api/auth/logout`

Menghapus baris sesi lokal, memanggil `/sign-out` Neon Auth (non-blocking), mengosongkan cookie `mamasar_session` dan cookie Neon Auth, lalu redirect ke `/`.

---

## Produk

### `POST /api/products`

Endpoint petugas pendata di halaman `/agen`. Membuat UMKM baru sekaligus produk pertama. Memerlukan cookie `mamasar_session` (petugas harus sudah login dengan Google); tanpa sesi, respons `401`. Toko yang dibuat lewat endpoint ini selalu berstatus `is_verified: 0` — pengurus MWC yang memverifikasinya — dan **tidak ditautkan ke akun petugas** (petugas mendata untuk penjual lain; penjual dapat mendaftarkan tokonya sendiri lewat dashboard). Format `multipart/form-data`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `umkmName` | Ya | Nama toko |
| `phone` | Ya | Nomor WhatsApp Indonesia yang valid |
| `zoneId` | Ya | ID zona MWC |
| `address` | Tidak | Alamat toko |
| `productName` | Ya | Nama produk |
| `price` | Ya | Harga dalam Rupiah |
| `category` | Tidak | Default `Makanan & Minuman` |
| `description` | Tidak | Deskripsi produk |
| `image` | Tidak | File gambar |
| `imageBase64` | Tidak | Alternatif file gambar |
| `shopeeUrl` | Tidak | Tautan Shopee |

Validasi nomor telepon memakai `isValidIndonesianPhone()`: hanya `08`, `628`, atau `8` diikuti angka 1-9, panjang 10 sampai 14 digit.

Respons `201`:

```json
{ "success": true, "slug": "nama-produk-k7x8", "productId": 12 }
```

Kode gagal: `401` belum login, `400` field wajib atau nomor tidak valid, `500` error server.

### `POST /api/products/bump`

Format `multipart/form-data`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `productId` | Ya | ID produk |

Memerlukan cookie `mamasar_session` milik pemilik toko; `umkm_id` produk harus cocok dengan toko milik user. Respons bila bukan pemilik: `403`.

Respons `200`: `{ "success": true, "message": "..." }`.

### `POST /api/products/delete`

Field dan aturan otorisasi sama dengan bump. Menghapus baris produk secara permanen.

### `POST /api/products/toggle-stock`

Field dan aturan otorisasi sama dengan bump. Membalik nilai `is_sold_out`.

Respons `200`:

```json
{ "success": true, "is_sold_out": 1, "message": "Status produk berhasil diubah menjadi: Habis Terjual" }
```

---

## Toko

### `POST /api/umkm/setup`

Memerlukan cookie `mamasar_session`. Format `multipart/form-data` atau form biasa.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `name` | Ya | Nama toko |
| `phone` | Ya | Nomor WhatsApp valid |
| `zoneId` | Ya | ID zona MWC |
| `address` | Tidak | Alamat toko |
| `claimStoreId` | Tidak | ID toko orphan yang diambil alih (jawaban "Ya" dari penjual pada panel konfirmasi klaim) |
| `skipClaim` | Tidak | `1` bila penjual menolak klaim — paksa buat toko baru |

Bila user sudah punya toko, data toko diperbarui. Bila belum:

1. Bila ada toko orphan (hasil pendataan `/agen`, tanpa `user_id`) dengan nomor WhatsApp yang sama dan belum ada keputusan klaim, toko itu **ditawarkan** — respons `200` berisi `{ "success": false, "claim_available": true, "candidate": { "id", "name", "zone_name" }, "message" }`. Tidak ada data yang berubah.
2. `claimStoreId` → toko orphan ditautkan ke `user_id` penjual, profilnya diperbarui dengan isian form, `is_verified` tetap `0`.
3. `skipClaim` → toko baru dibuat dan ditautkan ke `user_id`.

Klaim digerbang `user_id IS NULL` + kecocokan nomor WhatsApp, sehingga ID toko tebakan tidak bisa membajak toko dan dua penjual tidak bisa mengambil toko yang sama. Bila toko sudah diambil alih lebih dulu: respons `409`.

Respons `200`: `{ "success": true, "storeId": 5, "claimed": false, "message": "..." }`.

### `POST /api/umkm/add-product`

Memerlukan cookie `mamasar_session` dan profil toko. Format `multipart/form-data`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `name` | Ya | Nama produk |
| `price` | Ya | Harga |
| `category` | Tidak | Default `Makanan & Minuman` |
| `description` | Tidak | Deskripsi |
| `image` | Tidak | File gambar |
| `imageBase64` | Tidak | Alternatif file gambar |
| `shopeeUrl` | Tidak | Tautan Shopee |

Respons `201`: `{ "success": true, "slug": "...", "productId": 13, "message": "..." }`. Bila sesi tidak ada: `401`. Bila toko belum dibuat: `403`.

### `POST /api/umkm/verify`

Endpoint pengurus MWC di halaman `/pengurus`. Memerlukan cookie `mamasar_session` milik akun dengan `users.role = 'pengurus'`. Format `multipart/form-data`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `umkmId` | Ya | ID toko |
| `verified` | Ya | `1` = verifikasi, `0` = cabut verifikasi |

Status target dikirim eksplisit (bukan flip), sehingga klik ganda tidak membalik hasil. Respons `200`: `{ "success": true, "message": "..." }`. Tanpa sesi: `401`; bukan pengurus: `403`; toko tidak ada: `404`.

### `POST /api/umkm/delete`

Endpoint pengurus MWC di halaman `/pengurus`. Gerbang sesi + role sama seperti `/api/umkm/verify`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `umkmId` | Ya | ID toko |

Menghapus toko beserta seluruh produknya (FK cascade). Akun pemilik toko (bila ada) tetap utuh — hanya kehilangan tokonya. Respons `200`: `{ "success": true, "message": "..." }`; `401`/`403`/`404` mengikuti `/api/umkm/verify`.

### `POST /api/events`

Endpoint PCNU / MWCNU untuk kelola agenda kegiatan (form di `/admin` & `/kegiatan`). Memerlukan cookie `mamasar_session` dengan peran `pcnu` atau `mwcnu` (`events:manage`, terscoped ke `assigned_zone_id` untuk MWCNU). Format `multipart/form-data`; field `action` menentukan aksi.

**`action=create`** — buat agenda baru. Respons `201`: `{ "success": true, "eventId": 7, "slug": "...", "message": "..." }`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `action` | Ya | `create` |
| `title` | Ya | Judul acara — jadi dasar slug |
| `organizer` | Ya | Penyelenggara (MWC/Banom) |
| `zoneId` | Ya | ID zona MWC |
| `eventDate` | Ya | `YYYY-MM-DDTHH:mm` (wall-clock, disimpan sebagai UTC) |
| `timeDescription` | Ya | Deskripsi waktu, mis. `19.30 WIB - Selesai` |
| `locationName` | Ya | Nama lokasi |
| `locationAddress` | Tidak | Alamat lokasi |
| `estimatedAttendance` | Tidak | Estimasi jamaah, default `0` |
| `consumptionNeeded` | Tidak | Kebutuhan konsumsi panitia |
| `allowStalls` | Tidak | `on` bila warga diizinkan buka lapak |
| `coordinatorName` | Tidak | Nama koordinator |
| `coordinatorPhone` | Ya | Nomor WA koordinator (dinormalisasi `62xx`) |

**`action=update`** — ubah agenda. Tambah field `eventId` (wajib); field lain sama seperti `create`. Slug tidak berubah agar URL publik stabil. Respons `200`.

**`action=delete`** — hapus agenda. Hanya butuh `eventId`. Respons `200`.

Tanpa sesi: `401`; bukan pengurus: `403`; agenda tak ada (update/delete): `404`; validasi gagal: `400`.

---

## Pengguna

### `POST /api/user/avatar`

Menerima `multipart/form-data` atau `application/json`.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `imageFile` | Salah satu | File gambar, khusus multipart |
| `imageBase64` | Salah satu | Data URL atau base64 |
| `userId` | Tidak | Hanya dipakai untuk nama file; bukan otorisasi |

Bila user login, `users.avatar_url` diperbarui. Respons berisi `avatarUrl` dan `storageProvider`.

Catatan keamanan: field `userId` tidak diverifikasi terhadap sesi. Jangan andalkan endpoint ini untuk otorisasi per pengguna.

### `POST /api/user/cashbook`

Memerlukan cookie `mamasar_session`. Body JSON.

| Field | Wajib | Keterangan |
| :--- | :--- | :--- |
| `title` | Ya | Judul transaksi |
| `amount` | Ya | Nominal, disimpan sebagai nilai absolut |
| `type` | Tidak | `income` (default) atau `expense` |
| `category` | Tidak | Default `Penjualan` |
| `notes` | Tidak | Catatan |
| `transactionDate` | Tidak | Format `YYYY-MM-DD`, default hari ini |

Respons `201`: `{ "success": true, "message": "...", "entry": { ... } }`.

### `DELETE /api/user/cashbook`

Memerlukan cookie `mamasar_session`. Body JSON: `{ "id": 3 }`.

Respons `200`: `{ "success": true }` atau `{ "success": false }` bila tidak ada baris yang cocok dengan `user_id`.

### `POST /api/events/order` & `PATCH /api/events/order`

- `POST`: Endpoint publik (dilindungi rate limit `10` permintaan/jam per IP) untuk mengirim permohonan konsumsi berkat atau pengajuan lapak bazar warga pada halaman `/kegiatan/[slug]`. Field wajib: `eventId`, `type` (`consumption` | `stall`), `requesterName`, `requesterPhone` (nomor HP Indonesia valid). Field opsional: `umkmId`, `organization`, `notes`.
- `PATCH`: Endpoint pengurus (`pcnu` atau `mwcnu` sesuai `zone_id` acara via `can(user, 'events:manage', { zoneId })`) untuk mengubah `status` pengajuan (`pending` | `contacted` | `approved` | `rejected`) beserta pencatatan `audit_log`.

### `GET /api/user/export` & `POST /api/user/delete-account`

- `GET /api/user/export`: Memerlukan sesi login. Mengembalikan file JSON lampiran (`Content-Disposition: attachment`) berisi profil pengguna, profil UMKM, produk, buku kas, favorit, riwayat promosi, dan notifikasi.
- `POST /api/user/delete-account`: Memerlukan sesi login. Memvalidasi konfirmasi pengguna (`confirm: "HAPUS"`) dan menghapus permanen toko UMKM beserta data akun pengguna, kemudian mengosongkan cookie `mamasar_session`. Akun `SUPERADMIN_EMAIL` dikecualikan agar tidak terkunci.

---

## Utilitas

### `GET /api/neon/services`

Health check layanan Neon; memerlukan cookie `mamasar_session` (tanpa sesi, respons `401`), karena laporan ini mengekspos topologi infrastruktur. Menjalankan lima probe:

- Postgres: jumlah baris `zones`, `umkm`, `products`, `articles`, `events`, plus versi server.
- Object Storage: daftar objek pertama di bucket `assets`.
- Functions: panggil fungsi `hello`.
- Auth: ambil JWKS dan hitung jumlah key.
- Realtime: seal query contoh.

Respons berupa objek `{ timestamp, services: { postgres, object_storage, functions, auth, realtime } }`. Status tiap layanan bisa `connected`, `healthy`, `unconfigured`, `failed`, atau `error`.

### `GET /uploads/[...path]`

Menyajikan file dari `data/uploads/`. Route memakai `path.basename()`, sehingga hanya file yang berada langsung di `data/uploads/` yang dapat diakses. File avatar yang disimpan di `data/uploads/avatars/` tidak terjangkau lewat route ini.

Header respons: `Cache-Control: public, max-age=31536000, immutable`.

### `GET /sitemap.xml` dan `GET /robots.txt`

Sitemap dibuat dinamis dari produk, toko, artikel, kegiatan, dan zona. `robots.txt` mengizinkan semua halaman kecuali `/api/` dan mencantumkan lokasi sitemap.
