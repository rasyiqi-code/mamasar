export const PRODUCT_CATEGORIES = [
  'Makanan & Minuman',
  'Batik & Kerajinan',
  'Hasil Laut & Olahan',
  'Pertanian & Perkebunan',
  'Jasa & Lainnya',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const TARGET_MVP_PRODUCTS = 50;

export const DEFAULT_AGENT_PIN = '1926';

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

export const SITE_CONFIG = {
  name: 'Pasar Warga NU Sumenep',
  tagline: 'Direktori Digital UMKM Nahdliyin Kabupaten Sumenep',
  description:
    'Direktori Resmi Produk UMKM Nahdliyin Kabupaten Sumenep - Dukung ekonomi tetangga, transaksi langsung tanpa perantara.',
  defaultOgImage: '/og-image.jpg',
  organization: 'PCNU Kabupaten Sumenep',
};
