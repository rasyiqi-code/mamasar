export interface SeedZone {
  name: string;
  slug: string;
}

export interface SeedUMKM {
  name: string;
  phone: string;
  zone_slug: string;
  is_verified: number;
  address: string;
}

export interface SeedProduct {
  umkm_name: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  image_url: string;
  description: string;
  views: number;
  is_sold_out: number;
  shopee_url?: string;
}

export interface SeedArticle {
  title: string;
  slug: string;
  category: string;
  image_url: string;
  summary: string;
  content: string;
}

export interface SeedEvent {
  zone_slug: string;
  title: string;
  slug: string;
  organizer: string;
  event_date: string;
  time_description: string;
  location_name: string;
  location_address?: string;
  estimated_attendance: number;
  consumption_needed?: string;
  allow_stalls: number;
  coordinator_name?: string;
  coordinator_phone: string;
}

export const SEED_ZONES: SeedZone[] = [
  // 18 MWC Daratan
  { name: 'MWC Kota Sumenep', slug: 'mwc-kota-sumenep' },
  { name: 'MWC Batuan', slug: 'mwc-batuan' },
  { name: 'MWC Kalianget', slug: 'mwc-kalianget' },
  { name: 'MWC Manding', slug: 'mwc-manding' },
  { name: 'MWC Gapura', slug: 'mwc-gapura' },
  { name: 'MWC Bluto', slug: 'mwc-bluto' },
  { name: 'MWC Saronggi', slug: 'mwc-saronggi' },
  { name: 'MWC Lenteng', slug: 'mwc-lenteng' },
  { name: 'MWC Guluk-Guluk', slug: 'mwc-guluk-guluk' },
  { name: 'MWC Ganding', slug: 'mwc-ganding' },
  { name: 'MWC Pragaan', slug: 'mwc-pragaan' },
  { name: 'MWC Ambunten', slug: 'mwc-ambunten' },
  { name: 'MWC Pasongsongan', slug: 'mwc-pasongsongan' },
  { name: 'MWC Rubaru', slug: 'mwc-rubaru' },
  { name: 'MWC Dasuk', slug: 'mwc-dasuk' },
  { name: 'MWC Dungkek', slug: 'mwc-dungkek' },
  { name: 'MWC Batang-Batang', slug: 'mwc-batang-batang' },
  { name: 'MWC Batuputih', slug: 'mwc-batuputih' },

  // 9 MWC Kepulauan
  { name: 'MWC Talango', slug: 'mwc-talango' },
  { name: 'MWC Giligenting', slug: 'mwc-giligenting' },
  { name: 'MWC Gayam (Sapudi)', slug: 'mwc-gayam' },
  { name: 'MWC Nonggunong (Sapudi)', slug: 'mwc-nonggunong' },
  { name: 'MWC Raas', slug: 'mwc-raas' },
  { name: 'MWC Arjasa (Kangean)', slug: 'mwc-arjasa' },
  { name: 'MWC Kangayan (Kangean)', slug: 'mwc-kangayan' },
  { name: 'MWC Sapeken', slug: 'mwc-sapeken' },
  { name: 'MWC Masalembu', slug: 'mwc-masalembu' },
];

export const SEED_UMKM: SeedUMKM[] = [
  {
    name: 'UD Barokah Jaya',
    phone: '6281234567890',
    zone_slug: 'mwc-gapura',
    is_verified: 1,
    address: 'Dusun Karang Anyar, Gapura',
  },
  {
    name: 'Batik Madura Canteng',
    phone: '6287812345678',
    zone_slug: 'mwc-kota-sumenep',
    is_verified: 1,
    address: 'Jl. Trunojoyo, Kota Sumenep',
  },
  {
    name: 'Dapur Bu Fatimah',
    phone: '6285298765432',
    zone_slug: 'mwc-kalianget',
    is_verified: 1,
    address: 'Desa Marengan, Kalianget',
  },
  {
    name: 'Camilan Kang Hasan',
    phone: '6282334455667',
    zone_slug: 'mwc-ambunten',
    is_verified: 1,
    address: 'Dusun Pandan, Ambunten',
  },
  {
    name: 'Sentra Nira Dungkek',
    phone: '6281987654321',
    zone_slug: 'mwc-dungkek',
    is_verified: 1,
    address: 'Desa Lapa Laok, Dungkek',
  },
  {
    name: 'Barokah Rebon Saronggi',
    phone: '6282123459876',
    zone_slug: 'mwc-saronggi',
    is_verified: 1,
    address: 'Desa Tanjung, Saronggi',
  },
  {
    name: 'Krupuk Sari Laut',
    phone: '6285333444555',
    zone_slug: 'mwc-batang-batang',
    is_verified: 1,
    address: 'Desa Lombang, Batang-Batang',
  },
  {
    name: 'Madu Rimba Manding',
    phone: '6287711223344',
    zone_slug: 'mwc-manding',
    is_verified: 1,
    address: 'Desa Manding Laok, Manding',
  },
  {
    name: 'Jamu Warisan Lenteng',
    phone: '6282333777888',
    zone_slug: 'mwc-lenteng',
    is_verified: 1,
    address: 'Desa Lenteng Barat, Lenteng',
  },
  {
    name: 'Pengrajin Lontar Pragaan',
    phone: '6281333999111',
    zone_slug: 'mwc-pragaan',
    is_verified: 1,
    address: 'Desa Prenduan, Pragaan',
  },
  {
    name: 'Toko Santri Mandiri',
    phone: '6287888999000',
    zone_slug: 'mwc-kota-sumenep',
    is_verified: 1,
    address: 'Jl. KH. Agus Salim, Kota Sumenep',
  },
  {
    name: 'Camilan Barokah Bluto',
    phone: '6285222333444',
    zone_slug: 'mwc-bluto',
    is_verified: 1,
    address: 'Desa Aengbaja Raja, Bluto',
  },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    umkm_name: 'UD Barokah Jaya',
    name: 'Rengginang Lorjuk Super Asli Gapura',
    slug: 'rengginang-lorjuk-super-asli-gapura',
    price: 25000,
    category: 'Makanan & Minuman',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    description: 'Rengginang lorjuk khas Gapura Sumenep dengan taburan lorjuk melimpah dan rempah gurih asli. Renyah, tanpa pengawet buatan, cocok untuk camilan keluarga dan oleh-oleh khas Madura.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Madura Canteng',
    name: 'Kain Batik Tulis Madura Corak Sekar Jagad',
    slug: 'kain-batik-tulis-madura-corak-sekar-jagad',
    price: 185000,
    category: 'Batik & Kerajinan',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    description: 'Batik tulis asli pengrajin nahdliyin Sumenep. Menggunakan pewarna berkualitas dengan motif klasik Sumenep yang elegan, kain katun primissima dingin dan nyaman dipakai.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Dapur Bu Fatimah',
    name: 'Petis Ikan Cakalang Khas Kalianget',
    slug: 'petis-ikan-cakalang-khas-kalianget',
    price: 18000,
    category: 'Hasil Laut & Olahan',
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80',
    description: 'Petis ikan cakalang murni tanpa campuran tepung berlebih. Rasa gurih alami sangat cocok untuk rujak Madura, cocolan tahu, krupuk, dan bumbu dapur khas.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Camilan Kang Hasan',
    name: 'Kripik Singkong Balado Bawang Renyah 250g',
    slug: 'kripik-singkong-balado-bawang-renyah',
    price: 15000,
    category: 'Makanan & Minuman',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
    description: 'Camilan kripik singkong gurih khas pesisir Ambunten Sumenep, potongan tipis renyah dibumbui bawang dan cabai asli tanpa pewarna buatan.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Sentra Nira Dungkek',
    name: 'Gula Merah Siwalan Murni Dungkek',
    slug: 'gula-merah-siwalan-murni-dungkek',
    price: 22000,
    category: 'Pertanian & Perkebunan',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    description: 'Gula merah cetak alami asli dari nira pohon siwalan segar Dungkek Sumenep. Manis legit alami tanpa bahan pengawet.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Barokah Rebon Saronggi',
    name: 'Terasi Udang Rebon Asli Pesisir Saronggi',
    slug: 'terasi-udang-rebon-asli-pesisir-saronggi',
    price: 14000,
    category: 'Hasil Laut & Olahan',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    description: 'Terasi rebon asli nelayan Saronggi kualitas pilihan, wangi gurih sedap untuk sambal terasi mentah khas Madura.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Krupuk Sari Laut',
    name: 'Kerupuk Ikan Tongkol Gurih Renyah 500g',
    slug: 'kerupuk-ikan-tongkol-gurih-renyah-500g',
    price: 20000,
    category: 'Hasil Laut & Olahan',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    description: 'Kerupuk ikan tongkol segar racikan warga nahdliyin Batang-Batang. Ikan terasa pekat, mekar renyah gurih.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Madu Rimba Manding',
    name: 'Madu Hutan Liar Asli Madura 350ml',
    slug: 'madu-hutan-liar-asli-madura-350ml',
    price: 75000,
    category: 'Herbal & Jamu',
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    description: 'Madu murni hasil panen lebah liar perbukitan Manding. Murni tanpa campuran gula, bagus untuk daya tahan tubuh.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Jamu Warisan Lenteng',
    name: 'Jamu Ramuan Tradisional Madura Sehat Alami',
    slug: 'jamu-ramuan-tradisional-madura-sehat-alami',
    price: 35000,
    category: 'Herbal & Jamu',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    description: 'Ramuan herbal tradisional Madura olahan Fatayat NU Lenteng. Rempah alami temulawak, jahe merah, dan kunyit.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Pengrajin Lontar Pragaan',
    name: 'Tas Anyaman Daun Lontar Etnik Madura',
    slug: 'tas-anyaman-daun-lontar-etnik-madura',
    price: 45000,
    category: 'Batik & Kerajinan',
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80',
    description: 'Tas etnik ramah lingkungan dari anyaman daun lontar siwalan pilihan pengrajin Pragaan Sumenep. Kuat dan artistik.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Toko Santri Mandiri',
    name: 'Kopyah Santri Songkok Nasional Bordir NU',
    slug: 'kopyah-santri-songkok-nasional-bordir-nu',
    price: 65000,
    category: 'Fashion Muslim',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    description: 'Songkok bludru premium berkualitas dengan bordir logo lambang NU halus dan presisi. Nyaman dipakai santri.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Camilan Barokah Bluto',
    name: 'Keripik Pisang Madu Gurih Manis Bluto',
    slug: 'keripik-pisang-madu-gurih-manis-bluto',
    price: 16000,
    category: 'Makanan & Minuman',
    image_url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
    description: 'Keripik pisang pilihan diiris tipis dengan balutan karamel madu asli khas Bluto Sumenep. Renyah gurih manis.',
    views: 0,
    is_sold_out: 1,
  },
];

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'Ekonomi Pekarangan: Maksimalkan Lahan Rumah Menjadi Lumbung Rezeki Santri',
    slug: 'ekonomi-pekarangan-santri-sumenep',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
    summary: 'Bagaimana warga Nahdliyin Sumenep memanfaatkan pekarangan sempit untuk menanam cabai jamu, budidaya kelor, dan lele kolam terpal.',
    content: `Gerakan Ekonomi Pekarangan merupakan salah satu pilar ketahanan ekonomi nahdliyin yang sangat relevan untuk karakteristik geografis Kabupaten Sumenep. Dengan memanfaatkan pekarangan rumah berukuran 3x4 meter sekalipun, keluarga warga NU dapat menghasilkan komoditas bernilai jual tinggi.

### 1. Komoditas Unggulan Pekarangan Madura
- **Cabai Jamu (Cabe Jawa):** Tanaman rambat khas Sumenep yang tumbuh subur di iklim tropis pesisir. Harganya stabil di tingkat pengepul jamu dan permintaannya tidak pernah surut.
- **Kelor Organik:** Daun kelor Sumenep terkenal memiliki kualitas ekspor. Selain untuk sayur gizi harian keluarga, daun kering kelor dicari pabrik herbal dan industri teh santri.
- **Budidaya Ikan Lele Kolam Terpal Bioflok:** Dengan modal kurang dari Rp 500.000 untuk terpal bulat diameter 2 meter, panen lele dapat mensuplai warung makan tetangga secara konsisten setiap 2,5 bulan.

### 2. Sinergi dengan Mamasar
Hasil panen pekarangan yang berlebih tidak perlu bingung mencari tengkulak. Daftarkan panen Anda ke direktori Mamasar melalui kader MWC setempat. Tetangga satu desa atau kecamatan yang membutuhkan bahan pangan segar dapat langsung mengontak Anda via WhatsApp tanpa potongan tengkulak.`,
  },
  {
    title: 'Panduan Memulai Usaha Santri Nahdliyin Tanpa Modal Besar',
    slug: 'panduan-memulai-usaha-santri-modal-kecil',
    category: 'Panduan Usaha',
    image_url: 'https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?auto=format&fit=crop&w=800&q=80',
    summary: 'Langkah taktis bagi alumni pesantren dan kader muda NU untuk merintis usaha berbasis keahlian lokal dan jejaring jamaah.',
    content: `Banyak santri mengira memulai usaha membutuhkan modal puluhan juta rupiah. Padahal, modal terkuat seorang santri Nahdliyin adalah **integritas (*amanah*)** dan **jejaring jamaah yang solid**.

### 1. Mulai dari Produk yang Dibutuhkan Jamaah Sendiri
Jangan mencari produk yang asing. Perhatikan apa yang dibeli jamaah pengajian, tahlilan, dan madrasah setiap minggu:
- Camilan kering (rengginang, keripik singkong, kacang lorjuk).
- Kebutuhan santri (kopyah, sarung, minyak wangi non-alkohol, siwak).
- Jasa boga/katering konsumsi pengajian dan majelis shalawat.

### 2. Manfaatkan Skema Reseller & Konsinyasi
Jika belum memiliki dapur produksi sendiri, temui pengrajin atau produsen UMKM warga NU di MWC Anda. Ambil produk mereka dengan sistem bagi hasil atau harga grosir, lalu bantu pasarkan secara digital melalui katalog Mamasar.

### 3. Jaga Amanah & Kecepatan Komunikasi WhatsApp
Karena platform ini menghubungkan langsung ke WhatsApp Anda, pastikan:
- Membalas pesan pembeli dengan ramah dan salam islami.
- Menjelaskan kondisi produk secara jujur (tidak mengurangi timbangan atau menyembunyikan cacat).
- Tepat waktu saat janji kirim barang atau ketemuan COD.`,
  },
  {
    title: 'Panduan Sertifikasi Halal Gratis (SEHATI) untuk UMKM Sumenep',
    slug: 'sertifikasi-halal-gratis-sehati-umkm-sumenep',
    category: 'Legalitas & Halal',
    image_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    summary: 'Tata cara mendaftarkan sertifikasi halal gratis jalur self-declare melalui Pendamping PPH dari LPOM NU / ISNU Sumenep.',
    content: `Bagi pelaku usaha kuliner dan olahan pangan Nahdliyin di Sumenep, sertifikat halal resmi BPJPH kini dapat diurus **100% GRATIS** melalui program Sehati (Sertifikasi Halal Gratis).

### Syarat Utama Jalur Self-Declare:
1. Produk tidak berisiko (bahan baku dipastikan halal, tidak menggunakan daging sembelihan yang meragukan).
2. Memiliki Nomor Induk Berusaha (NIB) berbasis risiko (bisa dibantu cetak di kantor kecamatan atau agen MWC).
3. Menggunakan bahan yang sudah bersertifikat halal atau bahan alami tanpa proses kimiawi.

### Langkah Pengurusan:
- Hubungi Pendamping Proses Produk Halal (P3H) yang ada di PC ISNU atau Lembaga Perekonomian NU (LPNU) Kabupaten Sumenep.
- Pendamping akan datang meninjau dapur produksi Anda, memverifikasi bahan baku, dan mengunggah berkas ke sistem SiHalal Kementerian Agama.
- Setelah terbit, sertifikat halal akan meningkatkan kepercayaan pembeli berkali-kali lipat di katalog digital Mamasar!`,
  },
  {
    title: 'Panduan Transaksi COD Aman di Sumenep',
    slug: 'panduan-transaksi-cod-aman-di-sumenep',
    category: 'Tips Transaksi',
    image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
    summary: 'Tips ketemuan langsung dengan penjual warga NU, cek fisik barang, dan bayar di tempat tanpa risiko penipuan.',
    content: `Transaksi di Mamasar menggunakan sistem komunikasi langsung via WhatsApp tanpa perantara (*direct to seller*). Untuk menjaga kenyamanan bersama, ikuti panduan berikut:

### 1. Sepakati Titik Ketemu yang Ramai
Pilihlah lokasi pertemuan yang mudah diakses dan aman, seperti:
- Depan kantor MWC NU kecamatan setempat.
- Halaman masjid jami' atau balai desa.
- Toko / rumah produksi penjual langsung.

### 2. Periksa Kualitas Fisik Barang Terlebih Dahulu
Sebelum menyerahkan uang pembayaran:
- Buka kemasan dan periksa tanggal kedaluwarsa jika produk makanan.
- Periksa motif dan kehalusan kain jika membeli batik Madura.
- Pastikan jumlah barang sesuai pesanan yang disepakati di WhatsApp.

### 3. Utamakan Silaturahim
Transaksi antar-warga Nahdliyin tidak semata-mata transaksi jual-beli materiil, melainkan menyambung tali silaturahim dan ukhuwah nahdliyyah sesama warga Sumenep.`,
  },
  {
    title: 'Gerakan Belanja Produk Tetangga Nahdliyin: Uang Berputar di Warga Sendiri',
    slug: 'gerakan-belanja-produk-tetangga-nahdliyin',
    category: 'Gerakan Warga',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    summary: 'Memperkuat kemandirian ekonomi umat dengan mengutamakan membeli dari pedagang dan pengrajin tetangga sendiri.',
    content: `Gerakan *Beli Produk Tetangga Sendiri* adalah fondasi kebangkitan ekonomi warga. Ketika kita membeli rengginang, beras, batik, atau kopi dari sesama warga NU Sumenep:

1. **Keuntungan 100% Masuk ke Dapur Keluarga Warga:** Tidak ada potongan komisi aplikasi asing (0% admin fee).
2. **Dana Zakat & Infaq Tetap di Daerah:** Pedagang lokal berinfaq dan berzakat ke LAZISNU di desanya masing-masing.
3. **Menciptakan Lapangan Kerja Lokal:** Anak-anak muda dan santri di desa dapat bekerja di sentra produksi keripik dan batik tetangganya tanpa harus merantau ke luar pulau.

Mari dukung produk UMKM Nahdliyin Kabupaten Sumenep dengan mengutamakan membeli produk warga sendiri!`,
  },
];

export const SEED_EVENTS: SeedEvent[] = [
  {
    zone_slug: 'mwc-gapura',
    title: "Lailatul Ijtima' Rutin & Istighotsah Kubro MWC NU Gapura",
    slug: 'lailatul-ijtima-rutin-mwc-gapura',
    organizer: 'MWC NU Gapura & LDNU',
    event_date: '2026-11-20T19:30:00Z',
    time_description: '19.30 WIB (Ba’da Isya) - Selesai',
    location_name: 'Gedung Graha MWC NU Gapura',
    location_address: 'Jl. Raya Gapura, Dusun Karang Anyar, Gapura',
    estimated_attendance: 250,
    consumption_needed: 'Dibutuhkan 200 snack box kue basah tradisional dan 50 porsi nasi kotak jamuan ustadz & pengurus.',
    allow_stalls: 1,
    coordinator_name: 'Ustadz Kholilurrahman (Seksi Konsumsi)',
    coordinator_phone: '6281234567890',
  },
  {
    zone_slug: 'mwc-kota-sumenep',
    title: 'Peringatan Harlah Fatayat NU & Pameran UMKM Nahdliyin',
    slug: 'harlah-fatayat-nu-sumenep-pasar-rakyat',
    organizer: 'PC Fatayat NU Kabupaten Sumenep',
    event_date: '2026-11-28T08:00:00Z',
    time_description: '08.00 - 16.00 WIB',
    location_name: 'Halaman Gedung PCNU Kabupaten Sumenep',
    location_address: 'Jl. Trunojoyo No. 45, Kota Sumenep',
    estimated_attendance: 400,
    consumption_needed: 'Dibutuhkan 300 porsi nasi bungkus barokah dan 10 karton air mineral kemasan warga.',
    allow_stalls: 1,
    coordinator_name: 'Ning Siti Maryam (Koordinator Bazar)',
    coordinator_phone: '6287812345678',
  },
  {
    zone_slug: 'mwc-kalianget',
    title: "Majelis Diba' & Dzikir Rijalul Ansor Pesisir Kalianget",
    slug: 'majelis-diba-shalawat-ansor-kalianget',
    organizer: 'PAC GP Ansor Kalianget',
    event_date: '2026-12-05T19:30:00Z',
    time_description: '19.30 WIB - Selesai',
    location_name: "Masjid Jami' Pesisir Kalianget",
    location_address: 'Desa Marengan Laok, Kalianget',
    estimated_attendance: 180,
    consumption_needed: 'Dibutuhkan 150 porsi bubur/kolak hangat dan air minum kemasan untuk jamaah shalawat.',
    allow_stalls: 1,
    coordinator_name: 'Sahabat Fauzi (Wakil Ketua Rijalul Ansor)',
    coordinator_phone: '6285298765432',
  },
  {
    zone_slug: 'mwc-ambunten',
    title: 'Bazar Produk Pekarangan & Pengajian Akbar MWC Ambunten',
    slug: 'bazar-pekarangan-pengajian-ambunten',
    organizer: 'MWC NU Ambunten & Muslimat NU',
    event_date: '2026-12-12T13:00:00Z',
    time_description: '13.00 WIB - Menjelang Maghrib',
    location_name: "Halaman Madrasah Miftahul Ulum Ambunten",
    location_address: 'Dusun Pandan, Ambunten',
    estimated_attendance: 300,
    consumption_needed: 'Dibutuhkan 200 snack box hasil olahan ubi/singkong lokal dan minuman sari siwalan nira.',
    allow_stalls: 1,
    coordinator_name: 'Ibu Nyai Hj. Aminah',
    coordinator_phone: '6282334455667',
  },
];
