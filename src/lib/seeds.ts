import type Database from 'better-sqlite3';

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
}

export interface SeedArticle {
  title: string;
  slug: string;
  category: string;
  image_url: string;
  summary: string;
}

export const SEED_ZONES: SeedZone[] = [
  { name: 'MWC Kota Sumenep', slug: 'mwc-kota-sumenep' },
  { name: 'MWC Gapura', slug: 'mwc-gapura' },
  { name: 'MWC Kalianget', slug: 'mwc-kalianget' },
  { name: 'MWC Ambunten', slug: 'mwc-ambunten' },
  { name: 'MWC Batang-Batang', slug: 'mwc-batang-batang' },
  { name: 'MWC Manding', slug: 'mwc-manding' },
  { name: 'MWC Dungkek', slug: 'mwc-dungkek' },
  { name: 'MWC Saronggi', slug: 'mwc-saronggi' },
  { name: 'MWC Lenteng', slug: 'mwc-lenteng' },
  { name: 'MWC Bluto', slug: 'mwc-bluto' },
  { name: 'MWC Pragaan', slug: 'mwc-pragaan' },
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
    views: 1191,
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
    views: 1806,
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
    views: 983,
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
    views: 1053,
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
    views: 342,
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
    views: 528,
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
    views: 412,
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
    views: 675,
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
    views: 289,
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
    views: 198,
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
    views: 814,
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
    views: 375,
    is_sold_out: 1,
  },
];

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: 'Panduan Transaksi COD Aman di Sumenep',
    slug: 'panduan-transaksi-cod-aman-di-sumenep',
    category: 'Tips Transaksi',
    image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=300&q=80',
    summary: 'Tips ketemuan langsung dengan penjual warga NU, cek fisik barang, dan bayar di tempat.',
  },
  {
    title: 'Gerakan Belanja Produk Tetangga Nahdliyin',
    slug: 'gerakan-belanja-produk-tetangga-nahdliyin',
    category: 'Gerakan Warga',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
    summary: 'Memperkuat ekonomi lokal Sumenep dengan memprioritaskan belanja dari warung tetangga sendiri.',
  },
  {
    title: 'Cara Mendaftarkan Produk via Agen MWC',
    slug: 'cara-mendaftarkan-produk-via-agen-mwc',
    category: 'Pemberdayaan',
    image_url: 'https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?auto=format&fit=crop&w=300&q=80',
    summary: 'Hanya 90 detik melalui agen lapangan NU kecamatan, produk toko langsung tampil online.',
  },
];

/**
 * Seed database with structured demo data.
 * Can be run automatically on empty database, or forced via CLI script.
 */
export function seedDatabase(db: Database.Database, options?: { force?: boolean }) {
  const runSeed = db.transaction(() => {
    if (options?.force) {
      db.exec(`
        DELETE FROM products;
        DELETE FROM umkm;
        DELETE FROM zones;
        DELETE FROM articles;
        DELETE FROM sqlite_sequence WHERE name IN ('products', 'umkm', 'zones', 'articles');
      `);
    }

    // 1. Seed Zones
    const insertZone = db.prepare('INSERT OR IGNORE INTO zones (name, slug) VALUES (?, ?)');
    for (const z of SEED_ZONES) {
      insertZone.run(z.name, z.slug);
    }

    // Map zone slug to id
    const zoneMap = new Map<string, number>();
    const allZones = db.prepare('SELECT id, slug FROM zones').all() as { id: number; slug: string }[];
    for (const z of allZones) {
      zoneMap.set(z.slug, z.id);
    }

    // 2. Seed UMKM
    const insertUMKM = db.prepare(`
      INSERT INTO umkm (name, phone, zone_id, is_verified, address)
      VALUES (?, ?, ?, ?, ?)
    `);

    const umkmMap = new Map<string, number>();
    for (const u of SEED_UMKM) {
      const existing = db.prepare('SELECT id FROM umkm WHERE name = ?').get(u.name) as { id: number } | undefined;
      if (existing) {
        umkmMap.set(u.name, existing.id);
      } else {
        const zoneId = zoneMap.get(u.zone_slug) || 1;
        const res = insertUMKM.run(u.name, u.phone, zoneId, u.is_verified, u.address);
        umkmMap.set(u.name, Number(res.lastInsertRowid));
      }
    }

    // 3. Seed Products
    const insertProduct = db.prepare(`
      INSERT OR REPLACE INTO products (umkm_id, name, slug, price, category, image_url, description, views, is_sold_out)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of SEED_PRODUCTS) {
      const umkmId = umkmMap.get(p.umkm_name);
      if (umkmId) {
        insertProduct.run(
          umkmId,
          p.name,
          p.slug,
          p.price,
          p.category,
          p.image_url,
          p.description,
          p.views,
          p.is_sold_out
        );
      }
    }

    // 4. Seed Articles
    const insertArticle = db.prepare(`
      INSERT OR REPLACE INTO articles (title, slug, category, image_url, summary)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const art of SEED_ARTICLES) {
      insertArticle.run(art.title, art.slug, art.category, art.image_url, art.summary);
    }
  });

  runSeed();
}
