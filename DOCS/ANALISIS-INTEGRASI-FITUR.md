# Analisis Integrasi Antar Fitur: Mamasar Sumenep

Tanggal: 14 November 2026
Cakupan: integrasi data dan alur antara katalog, toko, verifikasi, zona, promosi, kredit sundul, buku kas, favorit, kegiatan, edukasi, kader, admin, dan autentikasi.
Sifat: analisis baca-saja. Tidak ada kode aplikasi yang diubah.
Dokumen terkait:
- `DOCS/AUDIT-FITUR-PREMATUR.md` (audit kode dan keamanan)
- `anti-slop/audit-001-2026-11-14.md` (audit UI/UX, rute, dan IA)

---

## 1. Cara membaca dokumen ini

Fitur yang berdiri sendiri jarang berguna. Nilai sebuah direktori UMKM justru lahir dari sambungan antar fitur: produk harus terhubung ke toko, toko ke zona, verifikasi ke katalog, promosi ke produk, pembayaran ke buku kas, kegiatan ke produk, dan admin ke pemilik.

Setiap sambungan dinilai dengan tiga status:

| Status | Arti |
|---|---|
| **Penuh** | Data mengalir dua arah, ada penegakan di server, dan ada layar yang menampilkannya. |
| **Sebagian** | Datanya ada, tetapi hanya satu arah, atau hanya tampil tanpa konsekuensi. |
| **Putus** | Fitur A mengubah data yang seharusnya dibaca fitur B, tetapi B tidak pernah membaca, tidak pernah memperbarui, atau tidak punya layar untuk itu. |

---

## 2. Peta pemilik data

| Fitur | Tabel utama | Kunci relasi | Aktor yang menulis |
|---|---|---|---|
| Toko (UMKM) | `umkm` | `user_id`, `zone_id` | warga (setup), petugas (entry) |
| Verifikasi toko | `umkm.is_verified` | `umkm.id` | petugas, superadmin |
| Produk | `products` | `umkm_id` | pemilik toko |
| Promosi | `ad_promotions` | `umkm_id`, `product_id`, `user_id` | pemilik toko, petugas, superadmin |
| Status unggulan | `products.is_featured`, `featured_until` | `products.id` | hasil approve promosi |
| Kredit sundul | `umkm.bump_credits` | `umkm.id` | approve promosi, aksi sundul |
| Buku kas | `cashbook` | **`user_id`** | pemilik akun |
| Favorit | `favorites` | `user_id`, `product_id` | pengguna login, sinkron dari tamu |
| Kegiatan | `events` | `zone_id` | superadmin, petugas |
| Edukasi | `articles` | tidak ada | seed DB (tidak ada endpoint) |
| Kader/petugas | `users.role`, `users.agent_status` | `assigned_zone_id` | pendaftar, superadmin |
| Zona | `zones` | | seed |

Dua hal langsung terlihat dari tabel ini:

1. **Buku kas memakai `user_id`, bukan `umkm_id`.** Semua fitur lain yang bersifat usaha memakai `umkm_id`.
2. **Kredit sundul adalah satu-satunya nilai uang di sistem yang tidak punya buku besar.** `ad_promotions` mencatat pembelian, tetapi tidak ada catatan pemakaian.

---

## 3. Matriks integrasi

| Dari | Ke | Mekanisme saat ini | Status |
|---|---|---|---|
| Produk | Toko | `products.umkm_id`, cascade delete | Penuh |
| Produk | Zona | join lewat `umkm.zone_id` | Penuh |
| Produk | Katalog publik | `getProducts()` tanpa filter verifikasi | Sebagian |
| Verifikasi toko | Katalog publik | hanya badge, tidak menyaring | **Putus** |
| Verifikasi toko | Kartu produk | badge "Warga NU" diberikan ke semua | **Putus** |
| Promosi | Produk unggulan | `is_featured`, `featured_until` | Sebagian |
| Promosi | Urutan katalog | `lastBumpedFirst` membaca `featured_until` | Penuh |
| Promosi | Badge unggulan | membaca `is_featured` mentah | **Putus** |
| Promosi | Riwayat pemilik | `getAdOrdersByUmkm()` tidak dipanggil | **Putus** |
| Promosi | Buku kas | tidak ada pencatatan pengeluaran | **Putus** |
| Promosi | Kredit sundul | approve menambah `bump_credits` | Penuh |
| Kredit sundul | Riwayat | tidak ada ledger | **Putus** |
| Kredit sundul | Dashboard | `?? 3` menutupi nilai kosong | Sebagian |
| Buku kas | Toko | memakai `user_id` | **Putus** |
| Buku kas | Produk | tidak ada `product_id` | **Putus** |
| Favorit tamu | Favorit akun | `syncGuestFavorites`, `onConflictDoNothing` | Penuh |
| Favorit | Logout | tidak dibersihkan | Sebagian |
| Kegiatan | Produk | `getProducts({ zoneSlug })` | Sebagian |
| Kegiatan | Toko peserta | tidak ada relasi partisipasi | **Putus** |
| Kegiatan | Pesanan konsumsi | hanya tautan WhatsApp | Sebagian |
| Edukasi | Aplikasi | DB, tanpa CRUD, tanpa tautan balik | Sebagian |
| Kader | Akses admin | `role` dan `agent_status` | Sebagian |
| Petugas | Zona | `assigned_zone_id` tidak dipakai di endpoint | **Putus** |
| Admin | Toko | verifikasi tanpa notifikasi dan tanpa audit log | Sebagian |

---

## 4. Alur integrasi yang putus

### I-01. Verifikasi toko tidak mengubah apa pun di katalog

**Yang diharapkan**
Toko terverifikasi tampil lebih dulu, mendapat badge, dan produknya boleh masuk katalog. Toko belum terverifikasi ditandai atau disembunyikan.

**Kenyataan**
- `getProducts()` (`src/lib/modules/products.ts:95-153`) tidak pernah memfilter `umkm.is_verified`.
- `getAllUMKM()` hanya mengurutkan `asc(is_verified)`, tetap menampilkan semua (`src/lib/modules/stores.ts:250`).
- `ProductCard.astro:138` memberi badge "Warga NU" ke semua produk tanpa syarat.
- `is_verified` punya `default(1)` di skema (`src/lib/schema.ts:60`) dan `toProduct` memakai `row.is_verified ?? 1` (`products.ts:35`).

**Dampak UX**
Badge verifikasi kehilangan makna. Pengguna tidak bisa membedakan toko yang sudah didatangi kader dari yang mendaftar sendiri. Ini juga menghapus insentif bagi petugas untuk mendata.

**Perbaikan**
1. `getProducts` menyaring `is_verified = 1` untuk katalog publik, atau mengurutkan yang terverifikasi lebih dulu dengan penanda jelas.
2. Badge hanya untuk `is_verified = 1`.
3. Ubah default kolom menjadi `0` agar baris baru tidak otomatis terverifikasi.

---

### I-02. Pemilik toko tidak bisa melihat status promosinya

**Yang diharapkan**
Setelah membayar, pemilik melihat: menunggu review, disetujui, ditolak dengan alasan, dan tanggal berakhir.

**Kenyataan**
`getAdOrdersByUmkm()` ada di `src/lib/modules/promotions.ts:124`, tetapi tidak dipanggil di `src/pages` maupun `src/components` (hasil `grep` kosong). `ServicesPanel` tidak memuat bagian promosi. Satu-satunya akses adalah `AdPromotionModal.astro`, yang hanya untuk membuat pesanan baru.

**Dampak UX**
Pembeli membayar lalu tidak punya tempat untuk memeriksa. Jika ditolak, `notes` yang ditulis reviewer tidak pernah terbaca oleh yang bersangkutan. Ini sumber keluhan paling mungkin setelah rilis.

**Perbaikan**
Panel "Riwayat Promosi" di dashboard: status, tanggal, nominal, bukti, dan alasan penolakan, plus tombol "Ajukan lagi".

---

### I-03. Pembelian promosi tidak masuk buku kas

**Kenyataan**
`cashbook` tidak punya relasi ke `ad_promotions`, dan `approveAdOrder` tidak menulis entri kas. Pemilik yang mencatat pemasukan penjualan di buku kas akan melihat saldo yang tidak memperhitungkan biaya iklan.

**Dampak UX**
Buku kas menjanjikan pembukuan, tetapi angka labanya salah untuk pengguna yang beriklan. Kepercayaan pada fitur pembukuan turun.

**Perbaikan**
Saat promosi disetujui, tulis entri `expense` bertipe `Iklan` dengan `reference_type='promotion'` dan `reference_id`. Atau, minimal tampilkan pengeluaran promosi sebagai baris terpisah di ringkasan kas.

---

### I-04. Iklan unggulan tidak pernah berakhir

**Kenyataan**
- `approveAdOrder` menulis `is_featured = 1` dan `featured_until` (`promotions.ts:236-249`).
- Urutan katalog sudah benar karena `lastBumpedFirst` mengecek `featured_until > NOW()` (`products.ts:88-92`).
- Tetapi `is_featured` tidak pernah dikembalikan ke `0`, dan `ad_promotions.status` tidak pernah menjadi `expired`.
- Tidak ada cron di `vercel.json` (file tidak ada) maupun di `astro.config.mjs`.

**Dampak UX**
Produk berhenti muncul di atas (karena urutan sudah benar), tetapi badge "Unggulan" di dashboard dan kartu tetap menyala. Pemilik mengira iklannya masih aktif, lalu kecewa saat tidak ada efeknya. Status pembayaran juga menggantung selamanya di `active`.

**Perbaikan**
Satu job harian `/api/cron/expire-promotions`:
1. `UPDATE products SET is_featured = 0 WHERE featured_until < NOW()`.
2. `UPDATE ad_promotions SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()`.
3. Kirim notifikasi ke pemilik.

---

### I-05. Kredit sundul tidak bisa diaudit

**Kenyataan**
- `bump_credits` ada di skema dengan `default(3)` (`schema.ts:64`).
- Approve paket sundul menambah kredit (`promotions.ts:262-268`).
- Aksi sundul mengurangi kredit dan menulis `products.bumped_at` (`products.ts:273-283`).
- Tidak ada tabel yang mencatat "kredit keluar untuk produk apa, kapan".

**Dampak UX**
Pemilik melihat saldo berkurang tanpa riwayat. Jika saldo tidak sesuai harapan, tidak ada cara membuktikan. Dukungan pengguna tidak punya data untuk menjawab.

**Perbaikan**
Tabel `bump_ledger(id, umkm_id, delta, reason, product_id, promotion_id, created_at)`, lalu tampilkan 10 transaksi terakhir di panel produk.

---

### I-06. Buku kas tidak terikat ke toko

**Kenyataan**
`cashbook.user_id` (`schema.ts:127-129`), sementara produk, promosi, dan verifikasi memakai `umkm_id`. `getCashbookSummary(user.id)` dan `getCashbookEntries(user.id, 50)` dipanggil dengan ID user (`src/pages/dashboard/index.astro:29-32`).

**Dampak UX**
Jika satu akun punya lebih dari satu toko (mungkin terjadi lewat klaim toko atau entri petugas), kas dua usaha bercampur dalam satu laporan. Ditambah `getUserFromSession` yang mengambil toko pertama, pemilik bisa melihat kas usaha A di dashboard usaha B.

**Perbaikan**
Pindahkan kunci ke `umkm_id` (dengan migrasi data), atau tegakkan satu user satu toko lewat unique index, lalu ubah label menjadi jelas.

---

### I-07. Dua sumber otorisasi peran

**Kenyataan**
- `isRanting()` mengembalikan `true` jika `role` adalah `ranting`, `mwcnu`, `pcnu`, **atau** `agent_status === 'active'` (`src/lib/modules/auth.ts:23-32`).
- `isPetugas = isRanting`, sehingga `mwcnu` dan `pcnu` juga dihitung "petugas".
- `reviewPetugas` menulis `role` dan `agent_status` sekaligus (`users.ts:119-136`).

**Dampak UX**
Label di header memakai `isRanting`, jadi pengurus MWC bisa muncul sebagai "Petugas MWC" (`Layout.astro:33`). Saat `agent_status` dan `role` tidak sinkron (misalnya setelah perubahan manual di DB), hak akses berubah tanpa perubahan peran yang terlihat.

**Perbaikan**
Satu fungsi `can(user, permission)` dengan tabel izin, dan satu sumber kebenaran peran. `agent_status` hanya untuk status pengajuan, bukan untuk otorisasi.

---

### I-08. Zona petugas tidak membatasi tindakan

**Kenyataan**
`users.assigned_zone_id` ada dan ditampilkan di dashboard, tetapi `umkm/verify.ts`, `umkm/delete.ts`, dan `promotions/review.ts` tidak membandingkan zona toko dengan zona petugas.

**Dampak UX**
Petugas melihat tombol yang tersedia untuk toko di luar wilayahnya, lalu berhasil menekannya. Antarmuka menjanjikan pembatasan yang tidak ada. Ketika nanti pembatasan diterapkan, alur kerja mereka berubah mendadak.

**Perbaikan**
Tegakkan di server lebih dulu, lalu sembunyikan tombol untuk toko di luar zona. Urutan ini penting: menyembunyikan tombol tanpa penegakan hanya menyamarkan celah.

---

### I-09. Kegiatan tidak terhubung ke toko peserta

**Kenyataan**
`events` punya `estimated_attendance`, `consumption_needed`, `allow_stalls`, dan `coordinator_*`. Halaman kegiatan hanya menampilkan produk dari zona yang sama (`kegiatan/[slug].astro:26-33`) lalu menautkan ke WhatsApp penjual dengan pesan yang menyebut nama kegiatan.

Tidak ada tabel partisipasi, tidak ada status "pesanan konsumsi diterima", tidak ada pendaftaran lapak.

**Dampak UX**
"Pasar Kegiatan" tampak seperti fitur pemesanan, padahal hanya direktori produk per zona dengan teks yang dipersonalisasi. Panitia tidak bisa melihat siapa yang menerima pesanan. Penjual tidak tahu ada permintaan.

**Perbaikan**
Minimal: tabel `event_orders(event_id, product_id, umkm_id, qty, status)` dan tombol "Ajukan pesanan konsumsi" yang membuat baris. Atau, jika ingin lebih murah, ubah label menjadi "Produk di sekitar lokasi kegiatan" agar tidak menjanjikan alur yang tidak ada.

---

### I-10. Favorit tamu bercampur antar pengguna perangkat

**Kenyataan**
- Tamu menyimpan di `localStorage` (`favorit.astro:189`).
- Saat login, `syncGuestFavorites` menyalin ke akun dengan `onConflictDoNothing` (`favorites.ts:31-43`).
- Logout tidak menghapus `localStorage`.
- Tombol "hapus semua" menghapus lokal lalu melakukan toggle untuk setiap kartu yang terlihat.

**Dampak UX**
Di warung atau ponsel bersama, pengguna berikutnya melihat favorit pengguna sebelumnya. Setelah login dengan akun lain, favorit lama ikut tersalin ke akun baru.

**Perbaikan**
Saat login berhasil, gabungkan lalu bersihkan `localStorage`. Saat logout, bersihkan juga. Tampilkan status "tersimpan di perangkat" versus "tersimpan di akun".

---

### I-11. Edukasi adalah pulau

**Kenyataan**
- Artikel hanya ada di tabel `articles`, dibaca `getArticles()` dan `getArticleBySlug()`.
- Tidak ada endpoint admin untuk membuat atau mengubah artikel. Isi hanya masuk lewat seed.
- Tidak ada tautan balik dari artikel ke toko atau produk yang relevan, selain `sampleProducts` generik di `edukasi/[slug].astro`.
- Rencana pindah ke subdomain GitHub Pages memutus sitemap dan tautan internal (`sitemap.xml.ts:49,72`).

**Dampak UX**
Artikel tidak mendorong penjualan, dan penjualan tidak mendorong pembacaan. Padahal artikel adalah satu-satunya konten yang bisa menarik pencarian Google jangka panjang.

**Perbaikan**
Saat migrasi ke subdomain:
1. Ubah sumber ke Markdown agar bisa dibangun statis.
2. Buat tautan internal absolut ke domain utama.
3. Tambahkan 301 dan hapus entri sitemap lama.
4. Di setiap artikel, tautkan 2 sampai 3 produk atau toko yang relevan dengan kategori artikel.

---

### I-12. Admin dan dashboard membaca data yang sama dengan dua cara

**Kenyataan**
- `AdminSidebar` dan `DashboardSidebar` adalah dua komponen, dua set tab, dua query.
- Verifikasi di admin mengubah `umkm.is_verified`, tetapi tidak ada notifikasi ke pemilik, tidak ada `audit_log`, dan tidak ada alasan penolakan.
- Superadmin yang juga punya toko melihat dua antarmuka yang tidak saling mengetahui.

**Dampak UX**
Pemilik tidak tahu tokonya sudah diverifikasi atau ditolak. Admin tidak punya jejak siapa mengubah apa. Pengguna dengan dua peran harus berpindah bahasa antarmuka.

**Perbaikan**
1. Tabel `audit_log(actor_id, action, entity, entity_id, before, after, created_at)`.
2. Notifikasi in-app sederhana (tabel `notifications`) untuk verifikasi dan promosi.
3. Satu shell dengan sakelar peran yang terlihat.

---

## 5. Kontrak data yang hilang

| Kebutuhan | Kondisi sekarang | Yang perlu ditambahkan |
|---|---|---|
| Jejak verifikasi | hanya `is_verified` | `verified_by`, `verified_at`, `verification_note` |
| Jejak review promosi | `reviewed_by_user_id` saja | `reviewed_at`, `amount_paid`, `payment_verified` |
| Buku besar kredit | tidak ada | tabel `bump_ledger` |
| Kas per usaha | `cashbook.user_id` | `cashbook.umkm_id` + `reference_type`, `reference_id` |
| Pesanan kegiatan | tidak ada | tabel `event_orders` |
| Notifikasi | tidak ada | tabel `notifications` |
| Audit admin | tidak ada | tabel `audit_log` |
| Klaim toko | kolom `claimed_at` ada, alur tidak ada | endpoint klaim + verifikasi bukti |

---

## 6. Dampak ke UI dan audit terkait

| Integrasi putus | Gejala yang dilihat pengguna | Rujukan audit |
|---|---|---|
| I-01 verifikasi | Badge "Warga NU" di semua produk | F-07, U-9 |
| I-02 riwayat promosi | Tidak ada layar status setelah bayar | R-8, tabel Rombak |
| I-03 kas dan promosi | Laba di buku kas terlalu tinggi | R-8 |
| I-04 unggulan abadi | Badge unggulan menyala selamanya | F-07, P1-1 |
| I-05 kredit | Saldo berubah tanpa riwayat | U-13 |
| I-06 kas per user | Kas dua toko bercampur | P0-5 |
| I-07 peran | Label "Petugas" pada pengurus MWC | F-06 |
| I-08 zona | Tombol tersedia untuk toko luar wilayah | P0-3 |
| I-09 kegiatan | Fitur terasa seperti pemesanan, padahal bukan | R-6, P-6 |
| I-10 favorit | Favorit orang lain muncul di perangkat bersama | A-06, U-23 |
| I-11 edukasi | Artikel tidak menambah penjualan | P-6, R-6 |
| I-12 admin | Tidak ada kabar setelah verifikasi | A-10, R-14 |

---

## 7. Urutan perbaikan yang disarankan

**Fondasi data (wajib lebih dulu)**
1. `cashbook.umkm_id` atau unique index satu user satu toko.
2. `audit_log` untuk verifikasi dan promosi.
3. `bump_ledger`.
4. `notifications` minimal (satu tabel, satu halaman).

**Penegakan aturan**
5. Filter `is_verified` di katalog dan ubah default kolom menjadi 0.
6. Batasi aksi petugas berdasarkan `assigned_zone_id`.
7. Satukan otorisasi peran lewat `can(user, permission)`.

**Penutupan siklus**
8. Job kedaluwarsa promosi.
9. Panel riwayat promosi untuk pemilik.
10. Catat pengeluaran promosi ke buku kas.

**Integrasi produk**
11. Tab partisipasi kegiatan, atau turunkan klaim fiturnya.
12. Tautan artikel ke produk, plus migrasi ke subdomain dengan 301.

---

## 8. Batas analisis

- Penilaian integrasi berasal dari pembacaan kode dan skema, bukan dari pengujian alur end-to-end di lingkungan berjalan.
- Tidak ada data produksi yang diperiksa, jadi dampak jumlah baris (misalnya berapa user punya dua toko) tidak diukur.
- Rekomendasi mengasumsikan satu pengguna idealnya satu toko. Jika model bisnis memang mengizinkan banyak toko per akun, bagian I-06 dan P0-5 perlu dirancang ulang, bukan sekadar diperbaiki.
- Semua nomor baris merujuk pada kondisi working tree saat analisis.
