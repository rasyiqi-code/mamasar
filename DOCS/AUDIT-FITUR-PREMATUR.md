# Audit Fitur Prematur: Mamasar Sumenep

Tanggal: 14 November 2026
Cakupan: seluruh `src/` (17 halaman, 28 endpoint API), `README.md`, `ROADMAP.md`, `DOCS/`
Sifat: audit baca-saja (read-only). Tidak ada kode aplikasi yang diubah.
Dokumen pendamping:
- `DOCS/ANALISIS-INTEGRASI-FITUR.md` (bagaimana fitur saling terhubung, dan di mana sambungannya putus)
- `anti-slop/audit-001-2026-11-14.md` (audit UI/UX, aksesibilitas, rute, dan IA)

---

## 1. Ringkasan eksekutif

Aplikasi ini sudah punya tulang punggung yang berfungsi: katalog, toko, produk, favorit, buku kas, dan panel admin. Masalahnya bukan "belum ada fitur", melainkan **fitur yang tampak selesai di UI tetapi belum utuh di server**, plus **klaim yang tidak didukung data**.

Tiga risiko terbesar, berurutan:

1. **Bypass verifikasi toko.** Siapa pun yang login bisa membuat toko yang langsung berstatus terverifikasi.
2. **IDOR produk.** Endpoint pembuatan produk menerima `umkmId` sembarang, sehingga produk bisa ditanam ke toko orang lain.
3. **Siklus promosi berbayar tidak pernah ditutup.** `featured_until` tidak pernah dikembalikan, status iklan tidak pernah menjadi `expired`, dan tidak ada cron. Pembeli status unggulan membayar untuk sesuatu yang tidak pernah berhenti, dan tidak ada bukti pembayaran yang wajib.

**Angka resmi yang dipakai di dokumen ini: 24 MWC (18 daratan + 6 kepulauan).** Angka ini dikonfirmasi pemilik produk. Kode dan seed sudah sesuai (24). Dokumen yang masih menulis 27 (18 + 9) adalah yang perlu diperbaiki.

Skor kesiapan produksi (perkiraan kasar, berbasis temuan di bawah):

| Aspek | Status | Catatan |
|---|---|---|
| Keamanan & otorisasi | Gagal | 2 celah kritis, 3 celah otorisasi zona/peran |
| Keamanan konten & privasi | Gagal | JSON-LD tidak di-escape, unggahan tanpa validasi, tanpa kebijakan privasi |
| Kelengkapan alur bisnis | Sebagian | Promosi, featured, bump, verifikasi belum tuntas |
| Konsistensi UI vs server | Sebagian | Beberapa tombol ada di UI tanpa penegakan di server |
| Kejujuran data | Gagal | Angka dan badge yang tidak bersumber dari data nyata |
| SEO & berbagi tautan | Sebagian | `og-image` tidak ada, sitemap memuat URL filter, canonical lemah |
| Dokumentasi | Gagal | README/ROADMAP berbeda dari kode |
| Higiene repo | Berisiko | File env ter-commit, DB SQLite 9,7 MB untracked |
| Proses & kualitas | Gagal | Tanpa test, CI, typecheck, atau lint |

---

## 2. Temuan kritis (P0)

### P0-1. Self-verify toko lewat `/api/umkm/create`

**Bukti**
- `src/pages/api/umkm/create.ts:8` hanya memeriksa apakah user login.
- Lalu memanggil `createStoreByPetugas`.
- `src/lib/modules/stores.ts:401` menulis `is_verified: 1`.

**Dampak**
Setiap warga yang mendaftar bisa membuat toko berlabel "Terverifikasi MWC NU" tanpa pernah didatangi kader. Badge verifikasi adalah janji utama produk ini ("pendataan jemput bola oleh kader MWC"), jadi celah ini menghapus nilai jual utamanya sekaligus membuka penyalahgunaan identitas NU.

**Perbaikan**
- Pisahkan dua jalur: `self-register` (default `is_verified: 0`) dan `petugas-register` (wajib role petugas + zona cocok).
- Tambahkan parameter eksplisit `verified` yang hanya boleh diisi server berdasarkan peran pemanggil, bukan dari body request.
- Tambahkan audit log: siapa memverifikasi, kapan, di zona mana.

### P0-2. IDOR pembuatan produk (`umkmId` dari body)

**Bukti**
- `src/pages/api/products.ts:24-26` menerima `umkmId` dari body request tanpa membandingkan dengan toko milik user.
- Jalur lain sudah benar dan bisa dijadikan contoh: `src/pages/api/umkm/add-product.ts:45` memakai `user.umkm.id`, `src/pages/api/products/edit.ts` dan `delete.ts` memakai `user.umkm.id`.

**Dampak**
User A dapat menambahkan produk ke etalase User B. Kombinasi dengan P0-1 memungkinkan penanaman produk palsu ke toko yang sudah terverifikasi.

**Perbaikan**
- Turunkan `umkmId` dari sesi (`getUMKMByUserId(user.id)`), jangan dari body.
- Jika butuh jalur petugas, buat endpoint terpisah dengan pemeriksaan zona.
- Tambahkan uji negatif: user lain harus mendapat 403.

### P0-3. Otorisasi zona tidak ditegakkan

**Bukti**
- `src/pages/api/umkm/verify.ts:17` tidak memeriksa apakah toko berada di zona petugas yang memverifikasi.
- `src/pages/api/umkm/delete.ts` memiliki masalah yang sama.

**Dampak**
Petugas MWC A bisa memverifikasi atau menghapus toko di MWC B. Prinsip "satu kader satu wilayah" tidak berlaku di server, hanya di tampilan.

**Perbaikan**
Ambil `zone_id` petugas dari sesi, lalu bandingkan dengan `zones.id` milik toko sebelum update/hapus. Tolak dengan 403 disertai pesan yang jelas.

### P0-4. Peran `petugas` dan `mwcnu` bisa menyetujui pembayaran global

**Bukti**
- `src/pages/api/promotions/review.ts:9` hanya memeriksa "bukan warga", lalu mengizinkan approve/reject.
- Tidak ada pemeriksaan kepemilikan transaksi, nominal, atau bukti bayar.

**Dampak**
Setiap petugas dapat menandai promosi mana pun sebagai lunas, di seluruh kabupaten. Ini adalah jalur penyalahgunaan uang paling langsung di aplikasi.

**Perbaikan**
- Batasi `approve` hanya untuk `mwcnu`/`pcnu`, atau untuk petugas yang menangani zona toko terkait.
- Wajibkan bukti bayar tersimpan sebelum status boleh `paid`.
- Catat `reviewed_by`, `reviewed_at`, dan `amount` pada baris promosi.

### P0-5. `getUserFromSession` mengambil baris `umkm` pertama hasil join

**Bukti**
`src/lib/db.ts` (`getUserFromSession`) memakai hasil join lalu mengambil elemen pertama.

**Dampak**
Jika satu user punya lebih dari satu toko (misalnya setelah migrasi atau duplikasi data), sesi bisa menempel ke toko yang salah. Semua pemeriksaan kepemilikan di atasnya ikut salah.

**Perbaikan**
Tentukan toko aktif secara eksplisit (kolom `active_umkm_id` di user, atau aturan "satu user satu toko" yang ditegakkan di DB dengan unique index).

---

## 3. Alur bisnis yang belum tuntas (P1)

### P1-1. Promosi unggulan tidak punya akhir

- `featured_until` di-set saat approve, tetapi tidak ada proses yang mengembalikan `is_featured` ke 0 saat tanggal lewat.
- Status pembayaran tidak pernah bertransisi ke `expired`.
- Tidak ada cron/job terjadwal di `vercel.json` maupun `astro.config.mjs`.
- Label "Unggulan" di `src/components/dashboard/ProductsPanel.astro` membaca `is_featured` mentah, jadi produk tetap tampil unggulan selamanya.

**Kebutuhan**: satu job harian (`/api/cron/expire-promotions`) yang: set `is_featured = 0` bila `featured_until < now()`, set `promotions.status = 'expired'`, dan kirim notifikasi ke pemilik.

### P1-2. Kuota "Sundul" tidak punya buku besar

**Koreksi terhadap versi awal audit:** `bump_credits` **ada** di skema (`src/lib/schema.ts:64`, `default(3)`), jadi klaim "kolom tidak ada" sebelumnya salah.

- `src/components/dashboard/ProductsPanel.astro:30`: `const bumpCredits = store.bump_credits ?? 3;` Nilai `3` hanya menutupi baris lama yang `NULL`, bukan angka karangan sepenuhnya.
- Pembelian paket sundul menambah kredit (`src/lib/modules/promotions.ts:262-268`).
- Konsumsi kredit mengurangi nilai (`src/lib/modules/promotions.ts:273-283`).

**Masalah sebenarnya**
1. Tidak ada tabel riwayat konsumsi kredit, jadi saldo tidak bisa diaudit dan tidak bisa dijawab "kredit saya habis untuk apa".
2. Setiap toko baru langsung mendapat 3 kredit gratis tanpa alasan tercatat.
3. Pemilik tidak bisa membeli kredit dari dashboard karena riwayat promosi tidak ditampilkan sama sekali (lihat P1-6).

**Pilihan**: tambahkan tabel `bump_ledger` (delta, alasan, promo_id, created_at) dan tampilkan riwayatnya, atau ganti model kredit dengan kuota harian berbasis `products.bumped_at`.

### P1-3. Bukti pembayaran bersifat opsional di server

- Form unggah bukti ada di `AdPromotionModal.astro`, tetapi endpoint `promotions/order.ts` menerima order tanpa bukti.
- Akibatnya antrean review bisa berisi order tanpa dasar verifikasi.

### P1-4. Verifikasi toko tidak punya status antara

Saat ini `is_verified` biner (0/1). Tidak ada keadaan "menunggu verifikasi", "ditolak dengan alasan", atau "perlu perbaikan data". Petugas tidak punya cara menjelaskan penolakan.

### P1-5. Peran tidak konsisten

- Kode memakai `pcnu`, `mwcnu`, `ranting`, `warga`.
- README menyebut "3 core roles".
- `Layout.astro:33` memakai `isRanting(user)` untuk menentukan "petugas", sehingga label peran di header bergantung pada satu helper yang mencampur konsep.

**Perbaikan**: satu sumber kebenaran `ROLES` di `src/lib/constants.ts` plus tabel pemetaan peran ke izin.

### P1-6. Riwayat promosi tidak pernah ditampilkan ke pemilik

`getAdOrdersByUmkm()` ada di `src/lib/modules/promotions.ts:124`, tetapi **tidak dipanggil di mana pun** (`grep` kosong di `src/pages` dan `src/components`).

Akibatnya pemilik toko tidak bisa melihat: status pesanan, bukti bayar yang diunggah, alasan penolakan (`notes`), atau kapan iklan berakhir. Uang keluar, status berubah, tetapi tidak ada layar yang menceritakannya.

**Perbaikan**: panel "Riwayat Promosi" di dashboard dengan status, tanggal, nominal, dan alasan penolakan.

---

## 4. Rute dan halaman prematur (P2)

| Rute | Status | Masalah |
|---|---|---|
| `/petugas` | Stub redirect | Hanya mengalihkan ke `/dashboard?intent=daftar-kader`. Di drawer dan footer, tautan berlabel "Daftar Kader / Pengurus MWC" mengarah ke sini, padahal isinya bukan formulir pendaftaran. |
| `/pengurus` | Stub redirect | `return Astro.redirect('/admin')` tanpa isi. Ada di sitemap, tidak ada di navigasi. |
| `/agen` | Redirect lama | Masih diekspor sebagai halaman; hanya komentar + redirect. |
| `/daftar-toko` | Tidak tertaut | Halaman ada, tetapi tidak ada navigasi yang menuju ke sana dari mana pun. |
| `/edukasi` | Ada isi | Artikel dibaca dari tabel `articles` saat request (`src/lib/modules/articles.ts:19-27`), bukan dari file. Hanya ada 3 artikel seed. Rencana: dipindah ke subdomain GitHub Pages (lihat 4.1). |

**Rekomendasi**
- Hapus `/pengurus` dan `/agen` dari build, atau ganti dengan halaman 404 yang jujur.
- Ubah label tautan `/petugas` agar sesuai isinya ("Ajukan Pendaftaran Kader"), atau buat halaman pendaftaran yang sebenarnya.
- Tentukan nasib `/daftar-toko`: tautkan dari `/toko` sebagai CTA, atau hapus.

### 4.1 Keputusan: Edukasi pindah ke subdomain GitHub Pages

Status: direncanakan. Belum dieksekusi.

**Alasan yang masuk akal**
- Isi edukasi hanya berubah beberapa kali sebulan, tidak butuh render per request.
- Halaman artikel adalah aset SEO jangka panjang, cocok untuk hosting statis gratis dan cepat.
- Memisahkan beban konten dari aplikasi transaksi mengurangi permukaan serangan di domain utama.

**Konsekuensi teknis yang harus diselesaikan**

1. **Sumber konten harus berubah dari DB ke file.**
   Saat ini `getArticles()` dan `getArticleBySlug()` membaca tabel `articles` lewat Drizzle. GitHub Pages tidak bisa menjalankan query. Isi harus menjadi Markdown/MDX di `src/content/edukasi/` dengan content collection, lalu dibangun jadi HTML statis. Karena baru ada 3 artikel, migrasinya murah sekarang dan mahal nanti.

2. **Tidak ada lagi editor artikel lewat DB.**
   Tidak ada endpoint admin untuk artikel (`src/pages/api` tidak punya rute article). Artinya alur penulisan berubah menjadi: tulis Markdown, commit, Actions membangun, Pages menerbitkan. Ini perlu disepakati karena pengurus tidak akan menulis lewat Git.

3. **`Layout.astro` tidak bisa dipakai ulang.**
   Layout itu mengimpor `getAllZones()`, `getUserFromSession()`, cookie sesi, dan drawer. Subdomain statis tidak punya sesi. Perlu layout minimal terpisah. Ini menambah satu lagi duplikasi shell di samping `AdminSidebar` dan `DashboardSidebar`, jadi putuskan sekarang: layout minimal yang sengaja berbeda (dengan 3 tautan balik ke domain utama), atau paket bersama.

4. **Tautan internal di dalam artikel harus absolut.**
   Artikel memuat tautan ke produk, toko, dan kegiatan (`/p/...`, `/toko/...`). Semua harus menjadi URL absolut ke domain utama, misalnya `https://mamasar.id/p/...`. Tautan relatif akan berujung 404 di subdomain.

5. **Sitemap harus dipecah.**
   `src/pages/sitemap.xml.ts:49` dan `:72` masih mencantumkan `/edukasi` dan `/edukasi/<slug>`. Setelah pindah, hapus kedua entri itu, dan buat sitemap terpisah di subdomain. Kalau tidak, Google akan mengindeks URL yang sudah dialihkan.

6. **Perlu pengalihan 301.**
   Pertahankan `/edukasi` dan `/edukasi/<slug>` di domain utama sebagai pengalihan permanen ke URL subdomain yang setara, supaya peringkat dan tautan lama tidak hilang. Jangan langsung menghapus rute.

7. **Konfigurasi Astro di subdomain.**
   Isi `site` dengan URL kanonik. Jika memakai project page (`username.github.io/repo`), tambahkan `base` dan pastikan semua aset memakai path itu. Jika memakai custom subdomain (`edukasi.domainanda`), tambahkan `CNAME` di repo dan jangan pakai `base`.

8. **Navigasi lintas domain.**
   Item "Panduan" di `Layout.astro` menjadi tautan keluar. Beri penanda yang jelas (misalnya ikon panah keluar dan `rel="noopener"`), atau buka di tab yang sama tanpa menyembunyikan bahwa pengguna berpindah situs.

9. **Schema.org artikel perlu diperbaiki saat migrasi.**
   `edukasi/[slug].astro` mengisi `author.url` dengan URL artikel itu sendiri. Ganti dengan URL organisasi, dan pastikan `publisher.logo` memakai URL absolut.

**Yang tidak perlu dikhawatirkan**
- Gambar artikel sudah memakai URL ImageKit absolut, jadi tidak terpengaruh.
- Tidak ada API yang perlu CORS, karena subdomain sepenuhnya statis.

**Urutan yang disarankan**
1. Ekspor 3 artikel dari DB ke Markdown.
2. Scaffold proyek Astro statis terpisah, deploy ke Pages.
3. Tambahkan 301 di domain utama dan hapus entri sitemap.
4. Ubah tautan "Panduan" di nav menjadi tautan keluar.
5. Baru tambah artikel dan kartu artikel di beranda utama.

---

## 5. Data dan klaim yang tidak bersumber (P3)

| Klaim | Lokasi | Kenyataan |
|---|---|---|
| "27 MWC (18 daratan + 9 kepulauan)" | README (`:10`, `:96`), ROADMAP (`:44`, `:137`), komentar `admin/index.astro:97` | **Angka yang benar adalah 24 zona: 18 daratan + 6 kepulauan.** Seed dan kode sudah benar (24): `src/lib/seeds.ts:54-79`, `ZonesPanel.astro:52-57`. Yang salah adalah dokumen, bukan data. |
| "100% Terpetakan" | `ZonesPanel.astro:184` | Tidak ada perhitungan; angka statis |
| "5.0 (Warga NU)" | `pages/toko/index.astro:197` | Bintang dan nilai hardcoded, tidak ada tabel rating |
| Badge "Warga NU" di setiap kartu | `ProductCard.astro:138` | Diberikan ke semua produk tanpa syarat verifikasi |
| "Baru Dipasang" | `ProductCard.astro:122` dan pemanggil | Diberikan ke semua kartu, tidak berbasis `created_at` |
| "bergaransi kualitas otentik" | `PromoSlider.astro:33` | Klaim jaminan tanpa mekanisme |
| "100% Nol Biaya Admin" | `index.astro:301` | Benar untuk transaksi, tetapi ada produk promosi berbayar; perlu dirumuskan ulang agar tidak menyesatkan |
| Statistik omzet di admin | README | Tidak ada query yang menghitungnya |

**Aturan yang disarankan**: setiap angka di UI harus punya query di belakangnya, atau ditulis sebagai placeholder jujur ("Belum ada data").

---

## 6. Dokumentasi vs kode (P4)

| Dokumen | Klaim | Kode |
|---|---|---|
| `README.md` | 3 peran inti | 4 peran (`pcnu`, `mwcnu`, `ranting`, `warga`) |
| `README.md` | 27 MWC (18 + 9) | **Salah. Angka resmi 24 (18 daratan + 6 kepulauan).** Kode dan seed sudah benar. |
| `README.md` | Dashboard admin menampilkan omzet | Tidak ada agregasi omzet |
| `README.md` | PWA dapat dipasang | Hanya ada `manifest.webmanifest`; tidak ada service worker |
| `ROADMAP.md` | 9 kepulauan | **Salah. Angka resmi 6 kepulauan.** Kode dan seed sudah benar. |
| `DOCS/API.md` | Beberapa endpoint | Perlu dicek ulang terhadap 28 file di `src/pages/api` |

**Perbaikan**: tambahkan satu bagian "Status Implementasi" di README dengan tabel fitur (Selesai / Sebagian / Rencana), lalu turunkan klaim yang tidak terpenuhi.

---

## 7. Duplikasi dan utang teknis (P5)

1. **Dua shell navigasi yang hampir identik.**
   `src/components/admin/AdminSidebar.astro` dan `src/components/dashboard/DashboardSidebar.astro` menduplikasi perilaku drawer, tombol hamburger, dan struktur tab. Setiap perbaikan aksesibilitas harus dilakukan dua kali.

2. **Dua mekanisme modal berbeda.**
   `ProductModals.astro` (custom div) dan `AdPromotionModal.astro` (custom div dengan `role="dialog"`), sementara `p/[slug].astro` punya modal ketiga. Tidak ada satu pun yang menangani Escape, focus trap, atau scroll lock secara konsisten.

3. **Tujuh aksi per baris di `ProductsPanel.astro`.**
   Unggulkan, Sundul, Edit, Stok, Hapus, Lihat, dan tautan WA. Ini melebihi kapasitas baris tabel di layar 360 px dan memaksa `flex-wrap`.

4. **Logika tab ditulis dua kali.**
   `src/scripts/admin.client.ts` dan `src/scripts/dashboard.client.ts` sama-sama mengatur `hidden`, hash, dan tombol aktif, tanpa `role="tab"` atau `aria-selected`.

5. **Kelas Tailwind tidak valid / no-op.**
   `active:scale-98` (18 file) dan `group-hover:scale-102` tidak ada di Tailwind v4. Efeknya tidak pernah terjadi.

6. **Peta memuat Leaflet dari CDN unpkg di dalam komponen.**
   `ZonesPanel.astro:101,107`. Ini memblokir render, menambah satu titik gagal eksternal, dan tidak punya fallback ketika offline.

---

## 8. Higiene repo (P6)

| Item | Risiko |
|---|---|
| `.env.production`, `.env.sandbox` ter-commit | Host database produksi terbuka. Placeholder tetap membocorkan topologi. |
| `src/pages/api/hello.ts`, `src/lib/neon.ts` | Sisa eksperimen, menambah permukaan serang. |
| `scripts/*-probe.mjs` | Skrip diagnostik ikut ter-commit. |
| `.emocis/emocis.db` (~9,7 MB, untracked) | Basis data lokal berisi data nyata, berpotensi ikut ter-commit. |

**Tindakan**
- Putar ulang kredensial yang pernah ada di file env ter-commit.
- Tambahkan `.env*` (kecuali `.env.example`) ke `.gitignore`, lalu `git rm --cached`.
- Tambahkan `.emocis/` ke `.gitignore`.

---

## 9. Temuan putaran kedua

Bagian ini mencatat temuan yang tidak masuk klasifikasi fitur prematur di atas: keamanan lanjutan, SEO dan berbagi tautan, performa, serta proses pengembangan. Semuanya dari pembacaan kode, bukan dari pengujian serangan.

### 9.1 Keamanan dan privasi

#### S-01. Stored XSS lewat JSON-LD (HIGH)

`src/layouts/Layout.astro:71` menulis:

```astro
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

`set:html` tidak melakukan escaping. `p/[slug].astro:71-97` menyusun `productSchema` dari `product.name` dan `product.description`, keduanya input pemilik toko. Nama produk berisi `</script><script>...</script>` akan keluar dari blok JSON-LD dan dieksekusi di origin yang sama, tempat cookie sesi berada.

Bukti bahwa pola ini sudah diketahui: `src/components/admin/EventsPanel.astro:147` melakukan `.replace(/</g, '\\u003c')` pada pola yang sama. Perbaikan itu belum diterapkan di `Layout.astro` dan `ZonesPanel.astro:381`.

**Perbaikan**: satu helper `safeJsonLd(obj)` yang meng-escape `<`, `>`, `&`, dan `\u2028/\u2029`, lalu dipakai di ketiga tempat.

#### S-02. Unggahan tanpa validasi tipe dan ukuran (HIGH)

`src/lib/storage.ts:63-90` menulis buffer apa pun ke disk atau ImageKit. Tidak ada pemeriksaan:

- MIME asli file,
- ukuran maksimum,
- ekstensi terhadap MIME.

Nama file diambil dari `imageFile.name`, jadi ekstensi ditentukan pengunggah. `src/pages/uploads/[...path].ts:27` menyajikan `.svg` sebagai `image/svg+xml` dari origin yang sama, tanpa CSP dan tanpa `Content-Disposition`. SVG dapat memuat skrip, sehingga unggahan menjadi jalur eksekusi kode.

Selain itu, `fs.writeFile` ke disk lokal di Vercel tidak persisten, sehingga fallback ini hanya menambah risiko tanpa manfaat di produksi. Tidak ada batas ukuran berarti permintaan besar dapat menghabiskan disk atau memori fungsi.

**Perbaikan**: whitelist `image/jpeg`, `image/png`, `image/webp`; tolak selain itu; batas 2 MB; verifikasi magic bytes; simpan dengan nama acak dan ekstensi yang diturunkan dari MIME, bukan dari nama file; jangan pernah menyajikan `image/svg+xml` dari domain aplikasi.

#### S-03. Tidak ada header keamanan dan tidak ada middleware (MEDIUM)

Tidak ada `src/middleware.ts`. Pencarian `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, dan `X-Content-Type-Options` di `src/` dan `astro.config.mjs` tidak menemukan apa pun.

Konsekuensi: aplikasi bisa di-embed di iframe situs lain (clickjacking), tidak ada lapisan kedua saat XSS terjadi, dan Referer lengkap bocor ke situs luar dari tautan WhatsApp atau artikel.

**Perbaikan**: middleware yang menambahkan `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, dan CSP bertahap (mulai dari `frame-ancestors 'none'` dan `object-src 'none'`).

#### S-04. Cookie sesi tanpa `Secure` dan berumur 30 hari (MEDIUM)

`src/pages/api/auth/email.ts:89` dan `src/pages/api/auth/callback/neon.ts:106` menulis:

```
mamasar_session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000
```

Tidak ada `Secure`, jadi cookie bisa terkirim lewat HTTP jika ada satu permintaan non-HTTPS. Tidak ada rotasi sesi setelah login, dan tidak ada `__Host-` prefix yang akan mengunci path dan Secure.

**Perbaikan**: tambahkan `Secure`, turunkan `Max-Age` ke 7 hari dengan perpanjangan saat aktif, dan putar ID sesi saat hak akses berubah (misalnya setelah menjadi petugas).

#### S-05. Tidak ada pembatasan laju di endpoint autentikasi (MEDIUM)

`src/pages/api/auth/email.ts` meneruskan setiap permintaan ke Neon Auth tanpa hitungan, jeda, atau captcha. Tidak ada pembatasan per IP maupun per email. Endpoint ini bisa dipakai untuk credential stuffing dan untuk membebani kuota auth upstream.

**Perbaikan**: pembatas sederhana berbasis tabel atau Redis (5 percobaan per 15 menit per email dan per IP), jeda eksponensial, dan pesan galat yang tidak membedakan "email tidak ada" dari "kata sandi salah".

#### S-06. Pesan galat internal dikirim ke klien (MEDIUM)

Ada 26 tempat di `src/pages/api` yang mengembalikan `message: err.message` atau `error.message` apa adanya. Contoh: `src/pages/api/products.ts`, `src/pages/api/favorites/sync.ts`, `src/pages/api/user/cashbook.ts`.

Dampaknya: nama kolom, constraint, dan detail driver database terlihat oleh pengguna. Ini memudahkan pemetaan skema dan menyulitkan dukungan karena pesan teknis tercampur pesan produk.

**Perbaikan**: satu helper `jsonError(status, publicMessage, err)` yang mencatat detail ke log server dan mengirim pesan generik ke klien.

#### S-07. Logout bisa dipicu lewat GET lintas situs (LOW)

`src/pages/api/auth/logout.ts` mengekspor `ALL`, sehingga `GET /api/auth/logout` menghapus sesi. Karena `SameSite=Lax`, navigasi tingkat atas dari situs mana pun membawa cookie, dan `<img src="https://mamasar.id/api/auth/logout">` cukup untuk mengeluarkan pengguna.

**Perbaikan**: batasi ke `POST`, atau minimal minta konfirmasi untuk GET.

#### S-08. `.gitignore` sengaja mengizinkan file env produksi (HIGH, lanjutan P6)

`.gitignore` memuat:

```
!.env.sandbox
!.env.production
```

Ini bukan kelalaian. Dua file itu secara eksplisit dikecualikan dari pengabaian, jadi akan ikut ter-commit setiap kali berubah. Jika berisi kredensial nyata, setiap commit baru memperbarui kebocoran.

**Perbaikan**: hapus dua baris negasi, `git rm --cached .env.production .env.sandbox`, putar ulang kredensial, dan simpan nilai produksi hanya di dashboard Vercel.

#### S-09. Data pribadi dikumpulkan tanpa kebijakan dan tanpa jalan keluar (MEDIUM)

`src/pages/api/umkm/setup.ts` dan `create.ts` mengumpulkan nama, nomor WhatsApp, alamat, NIB, sertifikat halal, PIRT, dan BPOM. Tidak ada:

- halaman kebijakan privasi,
- persetujuan saat pendaftaran,
- mekanisme hapus akun atau ekspor data.

Untuk direktori yang mengumpulkan data usaha dan nomor pribadi, ini masalah kepatuhan, bukan hanya kerapian.

**Perbaikan**: halaman `/privasi`, checkbox persetujuan di form, dan endpoint hapus akun yang menganonimkan data transaksi sambil menghapus data pribadi.

### 9.2 SEO dan berbagi tautan

#### S-10. Gambar pratinjau sosial tidak ada (HIGH untuk kanal WhatsApp)

`src/lib/constants.ts:60` menetapkan `defaultOgImage: '/og-image.jpg'`, dan `Layout.astro:61` memakainya sebagai `og:image`. `public/` hanya berisi `favicon.ico`, `favicon.svg`, `icon.svg`, `manifest.webmanifest`, dan folder `uploads`. Tidak ada `og-image.jpg`.

Akibatnya setiap tautan yang dibagikan ke WhatsApp, Facebook, atau Twitter menampilkan kartu tanpa gambar (atau gambar rusak). Karena kanal utama produk ini adalah WhatsApp, ini kehilangan yang terlihat setiap hari.

Selain itu nilainya relatif. Standar Open Graph meminta URL absolut.

**Perbaikan**: tambahkan `public/og-image.jpg` 1200x630, dan bentuk URL absolut dengan `new URL(image, Astro.url)`.

#### S-11. Sitemap memuat URL filter yang mengkanonikkan dirinya sendiri (MEDIUM)

`src/pages/sitemap.xml.ts:95-103` mendaftarkan `/?zona=<slug>` untuk setiap zona. Tetapi `Layout.astro:20` memakai `Astro.url.href` sebagai canonical, jadi halaman filter menyatakan dirinya sebagai versi resmi. Google menerima 24 URL filter sebagai halaman unik yang isinya hampir sama.

**Perbaikan**: hapus URL filter dari sitemap, atau ubah canonical halaman berfilter ke `/` dan tambahkan `noindex, follow`.

#### S-12. Canonical tidak menormalkan apa pun (MEDIUM)

Karena canonical adalah URL permintaan apa adanya, semua varian dianggap berbeda: `?utm_source=wa`, `?zona=semua`, garis miring di akhir, dan `http` versus `https`. Setiap kampanye WhatsApp membuat versi baru yang bisa diindeks.

**Perbaikan**: canonical dihitung dari path plus query yang diizinkan (`zona`, `kategori`, `q`), dengan host dan skema tetap.

#### S-13. Manifest PWA tidak valid (LOW)

`public/manifest.webmanifest` mendeklarasikan satu ikon:

```json
{ "src": "/icon.svg", "sizes": "192x192 512x512", "type": "image/svg+xml", "purpose": "any maskable" }
```

Spesifikasi manifest hanya menerima satu nilai ukuran per entri (atau `any` untuk SVG). `purpose: "any maskable"` juga tidak lazim: ikon maskable butuh zona aman, dan ikon yang sama tidak bisa sekaligus optimal untuk keduanya. Akibatnya Chrome kemungkinan mengabaikan ikon, dan "Tambahkan ke layar utama" tidak menghasilkan ikon yang benar.

**Perbaikan**: sediakan PNG 192 dan 512 terpisah, plus satu varian maskable dengan padding, dan ubah `sizes` menjadi satu nilai per entri.

#### S-14. Halaman pribadi ikut diindeks (LOW)

`Layout.astro:47` menulis `robots: index, follow` untuk semua halaman yang memakainya, termasuk `/favorit`. `AppLayout.astro:29` sudah benar dengan `noindex, nofollow`, jadi hanya halaman publik yang bermasalah.

**Perbaikan**: `noindex` untuk `/favorit`, atau pindahkan ke `AppLayout`.

#### S-15. Structured data produk tidak lengkap (LOW)

`productSchema` di `p/[slug].astro:71-97`:

- `image: [product.image_url]` bisa berisi `undefined` bila produk tanpa gambar, menghasilkan `"image": [null]`.
- Tidak ada `sku`, `brand`, atau `priceValidUntil`.
- `seller` bertipe `LocalBusiness` tanpa `url` atau `@id`, sehingga tidak terhubung ke entitas toko.

**Perbaikan**: filter nilai kosong sebelum serialisasi, tambahkan `sku` dari ID produk, dan beri `seller` sebuah `@id` yang stabil.

### 9.3 Performa dan ketahanan

#### S-16. Katalog tanpa paginasi dan tanpa cache (MEDIUM)

- `getProducts()` (`src/lib/modules/products.ts:95-153`) tidak punya `LIMIT`/`OFFSET`.
- `src/pages/index.astro` mengambil seluruh katalog lalu memotong di memori untuk tampilan beranda.
- `p/[slug].astro:66-69` mengambil seluruh kategori lalu menyaring dan memotong 4 untuk "produk terkait".
- `sitemap.xml.ts` memuat semua produk, toko, artikel, dan kegiatan pada setiap permintaan.
- Tidak ada lapisan cache di antara halaman dan database.

Pada 24 toko ini masih ringan. Pada 500 toko, beranda menjadi query penuh tabel setiap kunjungan, dan halaman produk menggandakan biaya itu.

**Perbaikan**: paginasi berbasis kursor di `getProducts`, query "terkait" dengan `LIMIT 4` di SQL, dan cache 60 detik untuk daftar publik.

#### S-17. Satu cookie per produk untuk penghitung tayangan (LOW)

`p/[slug].astro:24-35` menulis `mamasar_v_<id>` untuk setiap produk yang dibuka. Cookie tidak pernah dibersihkan, dan setiap cookie ikut terkirim pada semua permintaan berikutnya ke domain yang sama.

Pengguna yang membuka 100 produk mengirim 100 cookie di setiap permintaan. Browser membatasi sekitar 4 KB per domain, jadi sebagian cookie akan diam-diam terbuang dan penghitung menjadi tidak akurat.

**Perbaikan**: satu cookie berisi daftar ID terakhir (maksimal 20), atau penghitung tayangan berbasis hash sesi di server tanpa cookie per produk.

#### S-18. Tidak ada halaman 500 (LOW)

`src/pages/404.astro` ada, tetapi tidak ada `src/pages/500.astro`. Galat runtime yang tidak tertangkap akan menampilkan halaman galat bawaan kerangka kerja, yang di produksi bisa berupa layar kosong tanpa navigasi.

**Perbaikan**: tambahkan `500.astro` dengan pesan, tautan ke beranda, dan tombol coba lagi.

#### S-19. Gambar tanpa dimensi dan tanpa optimasi (LOW)

Tidak ada penggunaan `astro:assets`. `ProductCard.astro:60-67` memakai `<img>` biasa tanpa `width`/`height`, dan tidak ada `srcset`. Semua gambar produk dilayani dari ImageKit, yang mendukung transformasi, tetapi fitur itu tidak dipakai.

Akibatnya tata letak bergeser saat gambar selesai dimuat (CLS), dan gambar besar diunduh utuh di ponsel.

**Perbaikan**: tambahkan `width`, `height`, `decoding="async"`, dan `srcset` dengan parameter transformasi ImageKit (`?tr=w-400`).

### 9.4 Proses dan kualitas

#### S-20. Tidak ada test, CI, typecheck, atau lint (HIGH untuk proses)

- `.github/` tidak ada, jadi tidak ada CI.
- `package.json` hanya punya `dev`, `build`, `preview`, `start`, dan `astro`. Tidak ada `test`, `lint`, atau `check`.
- `@astrojs/check` sudah ada di `devDependencies` tetapi tidak pernah dipanggil.
- Tidak ada folder `tests/`, `test/`, atau `__tests__/`.

Artinya tidak ada satu pun pemeriksaan otomatis yang menahan regresi. Dua celah P0 di atas adalah jenis kesalahan yang akan tertangkap oleh satu test otorisasi sederhana.

**Perbaikan**: `astro check` di CI, satu test integrasi untuk otorisasi (produk milik toko lain ditolak), dan satu test untuk alur approve promosi.

#### S-21. Migrasi database tidak berversi (MEDIUM)

`scripts/migrate-neon.js` adalah satu skrip tunggal. Tidak ada tabel versi migrasi, tidak ada rollback, dan tidak ada riwayat urutan perubahan. Setiap perubahan skema menuntut pembacaan ulang seluruh skrip untuk tahu keadaan terkini.

**Perbaikan**: pakai `drizzle-kit` (sudah ada Drizzle di proyek) dengan folder migrasi berversi, atau minimal catat `schema_version` di database.

#### S-22. Tidak ada jejak audit untuk tindakan admin (MEDIUM)

Sudah disebut sebagai I-12 di `DOCS/ANALISIS-INTEGRASI-FITUR.md`, tetapi relevan di sini sebagai masalah proses: verifikasi toko, hapus toko, review promosi, dan perubahan peran tidak meninggalkan catatan siapa melakukannya.

**Perbaikan**: tabel `audit_log(actor_id, action, entity, entity_id, before, after, created_at)` dan tulis satu baris di setiap endpoint admin.

---

## 10. Prioritas kerja yang disarankan

**Minggu 1, keamanan (wajib sebelum rilis)**
1. Tutup P0-1, P0-2, P0-3, P0-4.
2. Tegakkan "satu user satu toko" (P0-5).
3. Escape JSON-LD di `Layout.astro` (S-01) dan validasi unggahan (S-02).
4. Putar kredensial, hapus baris negasi `.env` di `.gitignore`, lalu bersihkan repo (S-08).

**Minggu 2, kejujuran produk dan keamanan dasar**
5. Hapus atau ganti semua klaim tanpa sumber (bagian 5).
6. Perbaiki hitungan zona di README dan ROADMAP (24 zona, bukan 27).
7. Tambahkan `Secure` pada cookie sesi dan header keamanan lewat middleware (S-03, S-04).
8. Tambahkan `og-image.jpg` dan URL absolut (S-10).

**Minggu 3, kelengkapan alur**
9. Job kedaluwarsa promosi (P1-1).
10. Ganti token sundul karangan dengan buku besar nyata (P1-2).
11. Wajibkan bukti bayar (P1-3).
12. Tambahkan status "menunggu verifikasi" (P1-4).
13. Panel riwayat promosi (P1-6).

**Minggu 4, konsolidasi dan proses**
14. Satukan sidebar admin/dashboard, satukan modal, satukan logika tab.
15. Bersihkan rute stub dan tautan mati.
16. Hapus kelas Tailwind yang tidak valid.
17. Tambahkan `astro check` dan satu test otorisasi di CI (S-20).
18. Paginasi katalog dan cache 60 detik (S-16).

---

## 11. Batas audit ini

- Tidak ada pengujian beban, uji penetrasi formal, atau pengujian perangkat nyata.
- Temuan keamanan berasal dari pembacaan kode, bukan dari eksploitasi terkontrol.
- Skor kesiapan adalah penilaian kualitatif, bukan hasil pengukuran.
- Semua nomor baris merujuk pada kondisi working tree saat audit dilakukan.
- Temuan putaran kedua (bagian 9) tidak mengulang butir yang sudah ada di bagian 2 sampai 8, hanya menambah sudut yang belum tercakup.
