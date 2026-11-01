# PRD: Direktori Digital UMKM NU Sumenep (Core MVP)

## 1. Visi & Objektif Bisnis
Mengubah visibilitas produk warga NU Sumenep dari yang sebelumnya terbatas pada lingkaran pertemanan lokal menjadi entitas yang dapat ditemukan secara luas melalui mesin pencari, tanpa mengubah kebiasaan transaksi harian mereka.

- **Target Fase 1 (14 Hari):** 50 produk terindeks di mesin pencari, menghasilkan setidaknya 100 interaksi awal berupa pesan yang masuk ke penjual.
- **Core Value:** Nol friksi operasional bagi UMKM. Mereka tidak perlu belajar sistem baru; mereka hanya perlu membalas pesan masuk.

---

## 2. Evaluasi Asumsi & Blind Spots

- **Asumsi Salah:** Sistem butuh fitur manajemen stok dan pembayaran.
  - **Realita:** Membangun fitur tersebut sekarang adalah pemborosan sumber daya. Skala transaksi belum ada. Eksekusi transaksi mutlak dibiarkan terjadi secara natural melalui negosiasi langsung.

- **Asumsi Salah:** Pengguna (UMKM) akan proaktif memperbarui data katalog mereka.
  - **Realita:** Tingkat partisipasi mandiri akan mendekati nol di bulan pertama. Sistem ini harus dirancang sebagai alat bantu bagi tim internal dan agen di lapangan untuk melakukan pendataan jemput bola, bukan platform swalayan.

---

## 3. Arsitektur Fungsional (Tanpa Detail Infrastruktur)

### A. Antarmuka Publik (Front-End Pembeli)
- **Navigasi Katalog:**
  Pemetaan produk wajib dikategorikan berdasarkan hierarki wilayah administratif organisasi (Majelis Wakil Cabang/Kecamatan) dan jenis produk.
- **Halaman Detail Produk (Landing Page Khusus):**
  - Wajib dirancang dengan fokus 100% pada *Search Engine Optimization* (SEO). Struktur data halaman harus terbaca sebagai "Entitas Produk" oleh mesin pencari.
  - Wajib memiliki metadata dan Open Graph yang dinamis agar saat tautan dibagikan ke media sosial, muncul gambar produk dan judul yang jelas, bukan sekadar tautan kosong.
- **Sistem Konversi (Klik ke Komunikasi):**
  - Satu-satunya titik konversi adalah tombol aksi utama yang langsung membuka aplikasi pesan instan pembeli, mengarah ke nomor penjual.
  - Pesan harus diformat secara otomatis menyertakan nama produk dan tautan halaman asalnya agar penjual memiliki konteks instan.

### B. Antarmuka Manajemen (Back-Office Agen)
- **Sistem Entri Data Berkecepatan Tinggi:**
  - Formulir input internal yang sangat efisien, membatasi kolom isian hanya pada esensi dasar: Nama, Harga, Kategori, Area, dan Foto.
  - Proses unggah foto harus menyertakan kompresi otomatis untuk menghemat bandwidth tim lapangan dan mempercepat akses bagi pembeli.

---

## 4. Struktur Entitas Data Fundamental
Desain data harus dijaga pada tingkat paling dasar untuk MVP. Tidak ada relasi multi-tabel yang rumit.

| Entitas | Atribut Wajib | Deskripsi Fungsional |
| :--- | :--- | :--- |
| **Wilayah/Zona** | ID, Nama Zona | Dasar kategorisasi lokal untuk memicu sentimen "beli produk tetangga". |
| **Profil UMKM** | ID, Nama Usaha, Nomor Kontak, Status Verifikasi, ID Zona | Informasi entitas penjual. Status verifikasi digunakan untuk membangun kepercayaan pembeli. |
| **Produk** | ID, ID UMKM, Nama Barang, Harga Jual, URL Gambar | Unit katalog yang akan diindeks oleh mesin pencari. |

---

## 5. Rencana Eksekusi dan Perubahan Mindset
Dokumen ini sudah selesai dan mengunci semua logika yang kamu butuhkan. Jika pikiranmu kembali melayang memikirkan bagaimana cara terbaik menstruktur folder codebase atau mengkonfigurasi routing, hentikan. Itu hanya insting lamamu yang mencari rasa aman di balik kode.
