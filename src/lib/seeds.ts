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
  ranting?: string;
  nib?: string;
  halal_cert?: string;
  pirt?: string;
  maps_url?: string;
  qris_image_url?: string;
}

export interface SeedProduct {
  umkm_name: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  image_url: string;
  gallery_images?: string;
  description: string;
  views: number;
  is_sold_out: number;
  production_capacity?: string;
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

export interface SeedCaseStudy {
  title: string;
  channel_name: string;
  tag: string;
  duration: string;
  video_url: string;
  thumbnail_url: string;
  practice_summary: string;
  opportunity_summary: string;
  sort_order: number;
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

  // 6 MWC Kepulauan
  { name: 'MWC Talango', slug: 'mwc-talango' },
  { name: 'MWC Giligenting', slug: 'mwc-giligenting' },
  { name: 'MWC Nonggunong (Sapudi)', slug: 'mwc-nonggunong' },
  { name: 'MWC Raas', slug: 'mwc-raas' },
  { name: 'MWC Arjasa (Kangean)', slug: 'mwc-arjasa' },
  { name: 'MWC Sapeken', slug: 'mwc-sapeken' },
];

export const SEED_UMKM: SeedUMKM[] = [
  {
    name: 'Batik Rato',
    phone: '6285234158787',
    zone_slug: 'mwc-kota-sumenep',
    is_verified: 1,
    ranting: 'Pajagalan',
    address: 'Jln. dr Soetomo no 4 pajagalan kota Sumenep',
    nib: 'NIB',
  },
  {
    name: 'Depot Air Minum Tangere',
    phone: '6281703492507',
    zone_slug: 'mwc-batang-batang',
    is_verified: 1,
    ranting: 'Batang-Batang Daya',
    address: 'Dusun Tangere 03/04 Desa Batang Batang Daya Kec. Batang Batang Kab. Sumenep',
    nib: 'NIB',
  },
  {
    name: 'Cemilan Barokah Longos',
    phone: '6281913741969',
    zone_slug: 'mwc-gapura',
    is_verified: 1,
    ranting: 'Longos',
    address: 'Longos gapura sumenep',
    nib: 'NIB',
  },
  {
    name: 'Dapur Jajanan Gapura Tengah',
    phone: '6283116262031',
    zone_slug: 'mwc-gapura',
    is_verified: 1,
    ranting: 'Gapura Tengah',
    address: 'Gapura tengah',
    nib: 'NIB',
  },
  {
    name: 'Madu Naturiqu Somber Tombet',
    phone: '6281839363544',
    zone_slug: 'mwc-batuputih',
    is_verified: 1,
    ranting: 'Batuputih Kenek',
    address: 'Dusun pondok laok desa batuputih kenek kec batuputih sumenep',
    nib: 'NIB',
    halal_cert: 'HALAL',
    pirt: 'PIRT',
    maps_url:
      'https://maps.google.com/maps?q=Madu%2Bnaturiqu%2Bsomber%2Btombet%2Bpp%2Balmunawarah%2C%2BJl%2Bkh%2Bmunawar%2C%2BSumenep%2BRegency%2C%2B69453%2C%2BJawa%2BTimur%2C%2BID&sll=-6.91285771,113.92687091',
    qris_image_url: 'https://lh3.googleusercontent.com/d/1XBEstG5K71RcWPaG1HHchYMxGV0z30qq',
  },
  {
    name: 'Toko Kayla',
    phone: '6285231334415',
    zone_slug: 'mwc-kota-sumenep',
    is_verified: 1,
    ranting: 'Paberasan',
    address: 'Dusun Paberasan, Desa Paberasan, Kec. Kota Sumenep, Kabupaten Sumenep, Jawa Timur 69417',
    nib: 'NIB / PT',
    maps_url: 'https://www.google.com/maps/search/Toko%20Kayla/@-6.99458187,113.89355141,17z?hl=id',
  },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    umkm_name: 'Batik Rato',
    name: 'Kain Batik Tulis Motif Keris Hitam Phoenix',
    slug: 'kain-batik-tulis-keris-hitam-phoenix',
    price: 350000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-keris-hitam-phoenix.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/batik-model-keris-hitam.jpg',
    ]),
    description: 'Kain Batik Tulis asli karya perajin Batik Rato (WMS) Sumenep dengan motif sakral Keris dipadu ornamen Burung Phoenix berlatar hitam elegan. Menggunakan bahan kain katun prima pilihan ukuran 2.30 x 1.15 m dengan teknik canting tulis manual serta pewarna sintetis berkualitas prima yang awet dan tidak luntur. Cocok untuk dijahit menjadi kemeja formal, busana pesta, maupun busana adat.',
    production_capacity: '10 lembar/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kemeja Batik Pria Motif Keris Hitam Phoenix',
    slug: 'kemeja-batik-pria-keris-hitam-phoenix',
    price: 450000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-model-keris-hitam.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/batik-keris-hitam-phoenix.jpg',
    ]),
    description: 'Kemeja batik pria lengan panjang siap pakai dari Batik Rato Sumenep, menggunakan bahan kain katun prima batik tulis motif Keris Hitam Phoenix. Jahitan rapi berfuring halus, potongan reguler fit yang nyaman dan gagah untuk acara kedinasan, resepsi, maupun pertemuan organisasi NU.',
    production_capacity: '15 pcs/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kain Batik Tulis Kontemporer WMS Biru',
    slug: 'kain-batik-tulis-wms-biru',
    price: 350000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-rato-wms-kain-biru.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/batik-rato-wms-model-biru.jpg',
    ]),
    description: 'Kain Batik Tulis Kontemporer karya Rumah Produksi Batik Rato WMS Sumenep dengan komposisi gradasi warna biru royal dan corak modern dinamis. Dibuat manual canting tulis di atas katun prima 2.30 x 1.15 m, adem dipakai dan memiliki karakter warna tajam bercahaya.',
    production_capacity: '10 lembar/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kemeja Batik Pria Kontemporer WMS Biru',
    slug: 'kemeja-batik-pria-wms-biru',
    price: 450000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-rato-wms-model-biru.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/batik-rato-wms-kain-biru.jpg',
    ]),
    description: 'Kemeja batik pria lengan panjang motif kontemporer biru karya Batik Rato WMS. Tampil fresh, modern, dan berwibawa dengan bahan katun halus berlapis furing nyaman. Pilihan tepat untuk seragam kerja kantor, busana harian profesional, hingga agenda resmi.',
    production_capacity: '15 pcs/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kain Batik Tulis Motif Keris Merah Marun',
    slug: 'kain-batik-tulis-keris-merah',
    price: 350000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-keris-merah.jpg',
    gallery_images: JSON.stringify([]),
    description: 'Kain Batik Tulis Sumenep dengan motif Keris berlatar merah marun berwibawa karya Batik Rato. Canting pola tegas khas Madura yang melambangkan keberanian dan kepemimpinan. Bahan katun prima ukuran 2.30 x 1.15 m dengan ketahanan warna prima.',
    production_capacity: '10 lembar/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kain Batik Tulis Motif Keris Biru Samudra',
    slug: 'kain-batik-tulis-keris-biru',
    price: 350000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-keris-biru.jpg',
    gallery_images: JSON.stringify([]),
    description: 'Kain Batik Tulis Sumenep motif Keris dengan sentuhan rona biru samudra yang menyejukkan. Perpaduan filosofi pusaka khas Sumenep dengan estetika pesisir. Ukuran 2.30 x 1.15 m berbahan katun prima lembut dan sejuk di kulit.',
    production_capacity: '10 lembar/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kain Batik Tulis Kontemporer WMS Merah',
    slug: 'kain-batik-tulis-wms-merah',
    price: 350000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-rato-wms-kain-merah.jpg',
    gallery_images: JSON.stringify([]),
    description: 'Kain Batik Tulis Kontemporer motif abstrak geometris WMS dengan nuansa merah marun temaram karya Batik Rato Sumenep. Menonjolkan keindahan detail canting halus dan gradasi warna kaya. Cocok untuk busana kemeja, dress, tunik, atau bawahan rok lilit.',
    production_capacity: '10 lembar/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Batik Rato',
    name: 'Kemeja Batik Resmi Nahdlatul Ulama (NU)',
    slug: 'kemeja-batik-resmi-nahdlatul-ulama',
    price: 450000,
    category: 'Batik & Kerajinan',
    image_url: 'https://ik.imagekit.io/mamasar/products/batik-kemeja-nahdlatul-ulama.jpg',
    gallery_images: JSON.stringify([]),
    description: 'Kemeja Batik Tulis resmi bernuansa Nahdlatul Ulama (NU) persembahan Batik Rato Sumenep. Memadukan logo ornamen bintang sembilan tali jagad khas NU dengan ornamen flora Sumenep. Jahitan standar tailor profesional berfuring adem, sangat anggun dipakai dalam konferensi, pengajian akbar, pelantikan ranting/MWC, maupun kegiatan keorganisasian Nahdliyyin.',
    production_capacity: '20 pcs/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Depot Air Minum Tangere',
    name: 'Air Isi Ulang',
    slug: 'air-isi-ulang-tangere',
    price: 6000,
    category: 'Makanan & Minuman',
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    description: 'Air minum higenis dan menyegarkan.',
    production_capacity: '10-30/hari',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Cemilan Barokah Longos',
    name: 'Cemilan',
    slug: 'cemilan-kering-longos',
    price: 10000,
    category: 'Makanan & Minuman',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
    description: 'Produk berupa cemilan kering, seperti kacang kacangan, dan pangsit serta krupuk, produk ini bisa di jual eceran atau bahkan kiloan.',
    production_capacity: 'Untuk saat ini penjualan perbulan sekitar tujuh ribu pcs.',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Dapur Jajanan Gapura Tengah',
    name: 'Jajanan Tradisional',
    slug: 'jajanan-tradisional-gapura-tengah',
    price: 5000,
    category: 'Makanan & Minuman',
    image_url: 'https://lh3.googleusercontent.com/d/1PVoRqPsT5K3T8JMut1wil42fTmwgCHb2',
    description: 'Jajanan tradisional khas Sumenep yang gurih manis, dibuat segar setiap hari dengan cita rasa khas.',
    production_capacity: '30 pcs/hari',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Madu Naturiqu Somber Tombet',
    name: 'Madu Naturiqu',
    slug: 'madu-naturiqu-batuputih',
    price: 85000,
    category: 'Herbal & Jamu',
    image_url: 'https://ik.imagekit.io/mamasar/products/madu-naturiqu-super-250ml.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/madu-naturiqu-super-multiflora-350ml.jpg',
    ]),
    description: 'Madu Naturiqu adalah madu murni berkualitas super yang dihasilkan oleh lebah ternak Apis Mellifera penghisap nektar bunga (multiflora). Dipanen higienis tanpa campuran pemanis atau pengawet. Bermanfaat untuk meningkatkan daya tahan tubuh, sumber energi alami, dan menjaga stamina keluarga. Tersedia ukuran 250 ml (Rp 65.000) dan kemasan super 350 ml (Rp 85.000).',
    production_capacity: '50.dan tergantung permintaan',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Madu Naturiqu Somber Tombet',
    name: 'Madu Bawang Hitam Lanang Naturiqu',
    slug: 'madu-bawang-hitam-lanang-naturiqu',
    price: 120000,
    category: 'Herbal & Jamu',
    image_url: 'https://ik.imagekit.io/mamasar/products/madu-bawang-hitam-lanang-poster.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/madu-bawang-hitam-lanang-trio.jpg',
    ]),
    description: 'Kombinasi madu murni berkualitas tinggi dan ekstrak bawang hitam lanang (bawang tunggal) pilihan. Berkhasiat meningkatkan daya tahan tubuh, memelihara kesehatan jantung, memperlancar peredaran darah, membantu mengatasi kolesterol, dan menambah stamina kerja harian. Netto: 250 ml.',
    production_capacity: '50 botol/bulan',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Madu Naturiqu Somber Tombet',
    name: 'Madu Hitam Pahit Naturiqu',
    slug: 'madu-hitam-pahit-naturiqu',
    price: 125000,
    category: 'Herbal & Jamu',
    image_url: 'https://ik.imagekit.io/mamasar/products/madu-hitam-pahit-500gr-single.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/madu-hitam-pahit-500gr-trio.jpg',
    ]),
    description: 'Madu Hitam Pahit murni 100% alami tanpa bahan kimia dan pengawet. Karakteristik rasa pahit herbal alami dari nektar bunga tanaman obat. Berkhasiat membantu menurunkan dan menstabilkan gula darah, meredakan gangguan asam lambung/maag, serta mempercepat proses pemulihan kesehatan tubuh. Isi bersih: 500 gr.',
    production_capacity: '50 botol/bulan',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Madu Naturiqu Somber Tombet',
    name: 'Black Garlic Bawang Hitam Lanang',
    slug: 'black-garlic-lanang-naturiqu',
    price: 120000,
    category: 'Herbal & Jamu',
    image_url: 'https://ik.imagekit.io/mamasar/products/black-garlic-lanang-250gr.jpg',
    description: 'Bawang Hitam Lanang (Black Garlic) hasil proses fermentasi alami suhu terkontrol. Bertekstur lembut kenyal, rasa manis gurih tanpa rasa pedas getir bawang putih mentah. Kaya antioksidan SAC untuk menjaga kesehatan organ jantung, menurunkan tekanan darah, dan mendetoksifikasi tubuh. Netto: 250 gr.',
    production_capacity: '50 toples/bulan',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Toko Kayla',
    name: 'Pupuk Organik Hayati Cair Grow AF',
    slug: 'pupuk-grow-af-multi-usaha-nusantara',
    price: 23000,
    category: 'Pertanian & Perkebunan',
    image_url: 'https://ik.imagekit.io/mamasar/products/pupuk-grow-af-botol-asli.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/pupuk-grow-af-pekarangan-batu.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-grow-af-pekarangan-jagung.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-grow-af-pekarangan-pohon.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-greenhouse.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-semua-botol.jpg',
    ]),
    description: 'Pupuk organik hayati premium 100% organik ramah lingkungan untuk tanaman pangan, hortikultura, tembakau, dan pekarangan rumah tangga mandiri. Merangsang perakaran dan tunas, melarutkan fosfat tanah, mengendalikan jamur patogen layu dan hawar daun, serta menguraikan bahan organik tanah.',
    production_capacity: '500 botol/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Toko Kayla',
    name: 'Pupuk Organik Goat Bio Fertilizer',
    slug: 'pupuk-goat-bio-fertilizer-multi-usaha-nusantara',
    price: 20000,
    category: 'Pertanian & Perkebunan',
    image_url: 'https://ik.imagekit.io/mamasar/products/pupuk-goat-bio-fertilizer-botol-asli.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-kebun-sayur.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-sawah.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-pekarangan-taman.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-greenhouse.jpg',
    ]),
    description: 'Pupuk hayati cair spesialis kesuburan tanah hasil fermentasi dekomposisi kotoran kambing dengan konsorsium mikroorganisme pengurai aktif. Menyediakan nitrogen organik alami dan mineral mikro untuk memperbaiki struktur fisik tanah dan mengaktifkan ekosistem mikroba tanah.',
    production_capacity: '500 botol/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Toko Kayla',
    name: 'Pupuk Bio Misem G (Fase Generatif)',
    slug: 'pupuk-bio-misem-g-multi-usaha-nusantara',
    price: 27000,
    category: 'Pertanian & Perkebunan',
    image_url: 'https://ik.imagekit.io/mamasar/products/pupuk-bio-misem-g-botol-asli.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/pupuk-bio-misem-g-alam.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-semua-botol.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-greenhouse.jpg',
    ]),
    description: 'Pupuk organik cair formula khusus fase generatif (pembungaan dan pembuahan) 100% organik dengan nutrisi super power. Memenuhi kebutuhan hara pembentukan buah, mencegah kerontokan bunga, memperkuat batang, serta meningkatkan kualitas dan bobot panen.',
    production_capacity: '300 botol/minggu',
    views: 0,
    is_sold_out: 0,
  },
  {
    umkm_name: 'Toko Kayla',
    name: 'Pupuk Bio Misem V (Fase Vegetatif)',
    slug: 'pupuk-bio-misem-v-multi-usaha-nusantara',
    price: 27000,
    category: 'Pertanian & Perkebunan',
    image_url: 'https://ik.imagekit.io/mamasar/products/pupuk-bio-misem-v-botol-asli.jpg',
    gallery_images: JSON.stringify([
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-meja-taman.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-semua-botol.jpg',
      'https://ik.imagekit.io/mamasar/products/pupuk-lineup-greenhouse.jpg',
    ]),
    description: 'Pupuk organik cair ramah lingkungan dengan kandungan power nutrisi hara nitrogen hayati tinggi untuk memacu fase vegetatif tanaman. Pengganti efektif pupuk kimia urea yang mempercepat pembentukan klorofil daun, tunas, dan perakaran kokoh.',
    production_capacity: '300 botol/minggu',
    views: 0,
    is_sold_out: 0,
  },
];

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'Panduan Dasar Sebelum Menanam: Pengolahan Media Tanam dan Pupuk Dasar Organik',
    slug: 'panduan-dasar-sebelum-menanam-pekarangan',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    summary: 'Prinsip mendasar sebelum menanam di pekarangan: menyiapkan media tanam gembur formula 2:1:1 serta daur ulang sisa organik dengan dekomposisi anaerobik.',
    content: `> "Keseluruhan Sains tidak lebih dari perbaikan pemikiran sehari-hari."
> *(Albert Einstein)*

Sebelum mulai menanam komoditas apa pun di pekarangan rumah, baik itu cabai jamu, aneka sayuran, maupun tanaman toga, ada satu pertanyaan paling mendasar yang harus dijawab oleh setiap pegiat ekonomi pekarangan:

**Apa saja hal yang paling dasar yang harus dilakukan sebelum menanam?**

Kunci keberhasilan panen pekarangan bukan terletak pada benih mahal atau pupuk kimia sintetis, melainkan pada **kualitas media tanam** dan **kesiapan nutrisi dasar alami** yang siap diserap perakaran tanaman sejak hari pertama.

---

### 1. Menjamin Media Tanam (Pengolahan Lahan)

Langkah awal yang mutlak dipenuhi adalah memastikan media tanam dalam kondisi **gembur**. Tanah pekarangan yang padat atau tandus akan menghentikan sirkulasi udara dan menghambat pernapasan akar.

Media tanam yang gembur dan subur memiliki 3 ciri utama:
- **Ada unsur tanah atau humus:** Berfungsi sebagai fondasi penahan air dan penopang kokohnya sistem perakaran.
- **Ada unsur kompos (bahan organik yang sudah jadi):** Menyediakan unsur hara makro dan mikro alami yang stabil dan aman bagi bibit muda.
- **Ada sekam bakar atau sekam lapuk:** Berfungsi menjaga kegemburan, memperlancar aerasi oksigen, serta menjaga kelembapan media tanam agar tidak mengeras saat terpapar terik matahari.

#### Formula Takaran Baku Media Tanam:
Campurkan seluruh bahan secara merata dengan perbandingan:
- **2 bagian tanah**
- **1 bagian kompos** (bahan organik matang)
- **1 bagian sekam bakar / sekam lapuk**

*(Perbandingan 2 : 1 : 1)*

Aduk hingga homogen sebelum dimasukkan ke dalam kantong polybag, pot teras, atau bedengan pekarangan rumah Anda.

---

### 2. Pupuk Dasar (Input) Pertanian & Tanaman Organik

Ekonomi pekarangan nahdliyin menganut prinsip kemandirian pangan sirkular yang lestari. Prinsip dasarnya:

> **Apa yang "tersisa" dari konsumsi sehari-hari, dikembalikan lagi ke lahan atau media tanam.**

Sisa-sisa dapur rumah tangga (kulit buah, sisa sayuran, sisa nasi, air leri cucian beras) dan sisa tanaman di pekarangan tidak boleh terbuang percuma, melainkan dimanfaatkan kembali:

- **Metode Anaerobik (Kedap Udara):**
  Bahan-bahan sisa organik dimasukkan ke dalam wadah atau jeriken tertutup rapat (kedap udara). Kondisi tanpa oksigen bebas ini mempercepat proses pelapukan atau dekomposisi bahan organik oleh bakteri pengurai alami di dalam media tanam.
- **Hasil Nutrisi Alami:**
  Penguraian anaerobik ini menghasilkan nutrisi penting yang langsung menyuburkan mikroba tanah dan siap diserap akar tanaman sebagai energi pertumbuhan yang sehat dan bebas racun kimia.

---

Dengan memadukan media tanam gembur berformula 2:1:1 dan pengembalian sisa organik melalui dekomposisi anaerobik, lahan pekarangan rumah tangga keluarga warga NU siap menjadi lumbung pangan mandiri yang produktif dan berkah.`,
  },
  {
    title: 'Ekonomi Pekarangan Warga NU: 4 Pilar Kedaulatan Pangan Keluarga Nahdliyin',
    slug: 'ekonomi-pekarangan-warga-nu-sumenep',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
    summary: 'Konsep 4 pilar terpadu mengubah pekarangan rumah warga NU menjadi lumbung pangan mandiri, menekan belanja dapur, dan hilirisasi surplus panen.',
    content: `Gerakan Ekonomi Pekarangan merupakan ekosistem terpadu yang mengubah pekarangan rumah keluarga warga NU dari sekadar ruang konsumsi menjadi pusat produksi yang mandiri, sehat, dan berkelanjutan.

Prinsip dasarnya tegas: **amankan kebutuhan konsumsi gizi dan dapur keluarga sendiri terlebih dahulu, baru kemudian menjual surplus panen yang tidak habis dikonsumsi.**

---

### Empat Pilar Utama Ekonomi Pekarangan Warga NU

1. **Rumah Pangan Mandiri (RPM)**
   Menempatkan rumah tangga sebagai pusat produksi pangan aktif: menanam sayuran, buah, cabai, rempah, dan umbi-umbian di pekarangan sekitar rumah. Berfungsi sebagai jangkar ketahanan pangan harian yang memotong biaya belanja dapur keluarga serta menjamin pangan segar bebas pestisida.

2. **Kandang Keluarga Produktif**
   Sistem pemeliharaan ternak dan ikan skala rumah tangga (ayam kampung petelur/pedaging, itik, kambing, kelinci, dan kolam lele terpal). Menjadi pemasok rutin protein hewani keluarga, pupuk organik alami dari kotoran ternak, sekaligus berfungsi sebagai tabungan hidup riil (*Living Bank*) yang dapat dicairkan saat kebutuhan darurat tanpa tergerus inflasi.

3. **Apotek Hidup (Farmasi Mini)**
   Membudidayakan Tanaman Obat Keluarga (TOGA) seperti jahe merah, kunyit, temulawak, serai wangi, kencur, kumis kucing, lidah buaya, dan daun sirih. Menghadirkan kedaulatan kesehatan mandiri sebagai pertolongan pertama alami keluarga sekaligus bahan racikan jamu tradisional.

4. **Rumah Produksi Pekarangan (RPP)**
   Memfungsikan ruang dapur atau sekitar rumah sebagai pabrik mini untuk mengolah bahan mentah kebun dan kandang menjadi produk bernilai tambah (*value-adding*) dan tahan simpan. Mengolah kelebihan panen agar tidak busuk: cabai surplus menjadi sambal kemasan, pisang/singkong menjadi keripik, telur itik menjadi telur asin, dan rimpang TOGA menjadi jamu bubuk instan.

---

### Siklus Sirkular Zero-Waste & Sinergi dengan Mamasar
Keempat pilar ini bekerja dalam satu siklus tanpa limbah terbuang percuma (*zero-waste*). Sisa sayuran dari RPM menjadi pakan ternak di Kandang, kotoran ternak diolah menjadi pupuk untuk RPM dan Apotek Hidup, sementara surplus hasilnya diolah di Rumah Produksi Pekarangan (RPP).

Produk olahan dari RPP serta surplus panen segar yang tidak habis dikonsumsi dipasarkan langsung ke direktori digital **Mamasar** tanpa potongan komisi, serta diserap sebagai pasokan konsumsi kegiatan jam'iyah NU di tingkat Ranting dan MWC se-Kabupaten Sumenep.`,
  },
  {
    title: 'Budidaya Cabai Jamu Madura di Pekarangan: Emas Hijau Bernilai Tinggi',
    slug: 'budidaya-cabai-jamu-madura-pekarangan',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=800&q=80',
    summary: 'Panduan praktis menanam cabai jamu (cabe jawa) rambat di pekarangan rumah dengan kebutuhan air minim dan harga jual stabil.',
    content: `Cabai jamu (cabe jawa) merupakan salah satu komoditas rempah obat unggulan khas Kabupaten Sumenep yang telah dibudidayakan turun-temurun. Tanaman merambat ini toleran cuaca panas pesisir Madura dan membutuhkan lahan sangat minim, menjadikannya pilihan ideal untuk pekarangan rumah tangga keluarga warga NU.

### 1. Karakteristik & Keunggulan Cabai Jamu
- **Tahan Kekeringan:** Kebutuhan penyiraman minim setelah akar rambat menempel kokoh pada tiang panjat atau dinding pagar.
- **Serapan Pasar Pasti:** Permintaan dari industri jamu tradisional Madura dan pabrik herbal nasional selalu tinggi. Harga cabai jamu kering di tingkat pengepul lokal berkisar Rp 60.000 hingga Rp 110.000 per kg.
- **Masa Produktif Belasan Tahun:** Satu pohon cabai jamu yang terawat dapat terus berbuah selama lebih dari 10 tahun.

### 2. Langkah Tanam di Pekarangan
1. **Tiang Panjatan:** Manfaatkan tembok batas, pagar pekarangan, atau tanam tiang pohon kelor dan randu sebagai media rambat.
2. **Media Tanam:** Campurkan tanah gembur, pasir, dan pupuk kandang matang (perbandingan 2:1:1).
3. **Bibit Sulur:** Gunakan sulur panjat yang berakar kuat dan tanam dengan kemiringan mengarah ke tiang rambat.
4. **Perawatan:** Berikan pupuk kompos atau pupuk organik cair (POC) setiap dua minggu sekali pada masa pertumbuhan.

### 3. Pemanenan & Pengeringan
Petik buah yang mulai matang (semburat merah), lalu jemur di bawah sinar matahari Sumenep selama 3-5 hari hingga kadar air kering sempurna. Hasil panen dapat langsung dipasarkan ke sesama warga atau pedagang jamu melalui Mamasar.`,
  },
  {
    title: 'Budidaya Lele Kolam Terpal Bioflok Pekarangan: Modal Ringan Panen Berkala',
    slug: 'budidaya-lele-bioflok-pekarangan-sumenep',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    summary: 'Langkah merakit kolam terpal bulat diameter 2 meter di pekarangan rumah untuk panen lele segar konsumsi warga.',
    content: `Dengan memanfaatkan sudut pekarangan ukuran 2,5 x 2,5 meter, keluarga nahdliyin dapat merintis budidaya lele sistem bioflok kolam terpal bulat untuk menjamin ketahanan protein keluarga sekaligus sumber pemasukan kas berkala.

### 1. Keunggulan Bioflok Kolam Terpal
- **Hemat Air & Lahan:** Tidak perlu kuras air berkala karena mikroorganisme pengurai memanfaatkan sisa pakan dan kotoran menjadi flok protein alami.
- **Tidak Berbau:** Pengelolaan air dengan aerasi yang cukup memastikan kolam tetap bersih dan ramah untuk lingkungan perumahan.
- **Siklus Cepat:** Dari benih ukuran 7-9 cm, ikan lele dapat dipanen dalam waktu 65 hingga 75 hari.

### 2. Estimasi Kebutuhan Awal
- Terpal bulat D2 (diameter 2 meter) lengkap dengan rangka wiremesh: sekitar Rp 600.000.
- Mesin aerator mini (30-45 watt) dan selang aerasi: sekitar Rp 250.000.
- Benih lele unggul (Mutiara/Sangkuriang) 1.000 ekor: sekitar Rp 200.000.
- Garam krosok, molase, dan probiotik lactobacillus: sekitar Rp 75.000.

### 3. Panen & Distribusi Lokal
Tawarkan hasil panen hidup kepada warung makan, penjual lalapan, dan tetangga pengajian melalui katalog digital Mamasar. Kualitas lele bioflok terbukti lebih padat, gurih, dan tidak berbau lumpur.`,
  },
  {
    title: 'Sayur Polybag & Kelor Organik Pekarangan: Pangan Sehat dan Hemat Belanja',
    slug: 'sayur-polybag-kelor-mandiri-pangan',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
    summary: 'Menyulap teras dan pekarangan sempit menjadi kebun sayur mandiri keluarga nahdliyin Sumenep.',
    content: `Kebutuhan sayur harian keluarga dapat dihemat dengan memanfaatkan 15 hingga 20 kantong polybag di pekarangan rumah. Ibu-ibu Muslimat dan Fatayat NU dapat memetik sayur segar setiap hari tanpa harus mengeluarkan biaya belanja harian.

### 1. Tanaman Sayur Ideal untuk Cuaca Sumenep
- **Pohon Kelor (Maronggai):** Tumbuhan khas Madura yang kaya kalsium dan zat besi. Sangat tahan panas dan daunnya dapat dipetik rutin setiap minggu.
- **Cabai Rawit & Tomat:** Cukup tanam 5 polybag cabai rawit untuk memenuhi kebutuhan bumbu dapur keluarga sepanjang musim.
- **Kangkung & Bayam Cabut:** Panen kilat dalam 21-25 hari setelah semai.
- **Terong:** Berbuah lebat dalam polybag ukuran 35 cm atau kaleng bekas cat.

### 2. Media Tanam Sederhana
Gunakan komposisi seimbang 1:1:1 antara tanah gembur pekarangan, sekam padi matang, dan pupuk kandang matang. Siram di sore hari agar kelembapan terjaga. Bila panen berlebih, bungkus rapi dan pasang iklan di Mamasar untuk dibeli tetangga satu desa.`,
  },
  {
    title: 'Pupuk Organik Cair (POC) dari Limbah Dapur: Hemat Biaya Rawat Pekarangan',
    slug: 'panduan-poc-pupuk-organik-pekarangan',
    category: 'Ekonomi Pekarangan',
    image_url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    summary: 'Cara mudah meracik POC mandiri menggunakan sisa sayur, air cucian beras, dan molase tanpa bau menyengat.',
    content: `Kemandirian ekonomi pekarangan semakin optimal jika tidak bergantung pada pupuk kimia buatan pabrik. Bahan baku pupuk organik cair (POC) berkualitas tinggi sudah tersedia gratis di dapur rumah tangga setiap hari.

### 1. Bahan yang Dibutuhkan
- 5 liter air cucian beras pertama (air leri).
- 1 kg sisa sayuran dapur atau kulit buah (kulit pisang, pepaya, sisa sawi).
- 100 ml tetes tebu (molase) atau gula kelapa cair.
- 1 tutup botol cairan probiotik EM4 pertanian atau ragi tape.
- 1 jeriken plastik berpenutup rapat.

### 2. Langkah Pembuatan
1. Cacah halus sisa sayuran dan masukkan ke dalam jeriken.
2. Tuangkan air cucian beras, larutan gula, dan cairan probiotik.
3. Aduk rata, lalu tutup jeriken secara rapat.
4. Buka tutup selama 5 detik setiap pagi untuk mengeluarkan gas fermentasi alami.
5. Setelah 10-14 hari, cairan POC berwarna kecokelatan dengan aroma fermentasi tape yang segar siap digunakan.

### 3. Aturan Pakai
Encerkan 1 gelas POC (200 ml) ke dalam 1 ember air bersih (8-10 liter). Siramkan ke tanah pekarangan seminggu sekali untuk merangsang kesuburan daun dan ketahanan tanaman terhadap hama.`,
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

export const SEED_CASE_STUDIES: SeedCaseStudy[] = [
  {
    title: 'Yoso Farm: Kebun Sayur & Ternak Mandiri',
    channel_name: 'Channel OASIS',
    tag: 'Integrasi Pangan',
    duration: '22 Menit',
    video_url: 'https://www.youtube.com/watch?v=5Fv2tGv9_Vo',
    thumbnail_url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
    practice_summary: 'Integrasi tanaman sayur pekarangan & ternak tanpa perlu belanja kebutuhan harian.',
    opportunity_summary: 'Surplus panen segar & bibit diserap langsung oleh tetangga sekitar.',
    sort_order: 1,
  },
  {
    title: 'Kebun Galon: Sistem Kapiler Hemat Siram',
    channel_name: 'Channel OASIS',
    tag: 'Sistem Kapiler',
    duration: '20 Menit',
    video_url: 'https://www.youtube.com/watch?v=X__6wGg4tgc',
    thumbnail_url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
    practice_summary: 'Daur ulang galon bekas air mineral dengan sumbu kapiler tanpa siram setiap hari.',
    opportunity_summary: 'Solusi lahan sempit di perumahan warga dengan panen sayur bernilai jual tinggi.',
    sort_order: 2,
  },
  {
    title: 'Sayur Teras: Panen Rutin Cuan Bulanan',
    channel_name: 'Channel Cerita Alam',
    tag: 'Bisnis Sayur',
    duration: '12 Menit',
    video_url: 'https://www.youtube.com/watch?v=6ufb1CXnABs',
    thumbnail_url: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=600&q=80',
    practice_summary: 'Budidaya aneka sayuran segar di teras rumah warga sebagai usaha sampingan produktif.',
    opportunity_summary: 'Menghasilkan arus kas rutin mingguan dari pembeli tetangga komplek & warung terdekat.',
    sort_order: 3,
  },
];
