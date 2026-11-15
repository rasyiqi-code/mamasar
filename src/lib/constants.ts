import { getEnv } from './neon';

export const PRODUCT_CATEGORIES = [
  'Makanan & Minuman',
  'Batik & Kerajinan',
  'Hasil Laut & Olahan',
  'Pertanian & Perkebunan',
  'Fashion Muslim',
  'Herbal & Jamu',
  'Jasa & Layanan',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  'Semua': 'shopping-bag',
  'Makanan & Minuman': 'utensils',
  'Batik & Kerajinan': 'craft',
  'Hasil Laut & Olahan': 'fish',
  'Pertanian & Perkebunan': 'sprout',
  'Fashion Muslim': 'fashion',
  'Herbal & Jamu': 'herbal',
  'Jasa & Layanan': 'service',
};

export const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  'Semua': { label: 'Semua', color: 'bg-slate-100 text-slate-700 border border-slate-300' },
  'Makanan & Minuman': { label: 'Populer', color: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  'Batik & Kerajinan': { label: 'Pilihan', color: 'bg-amber-100 text-amber-900 border border-amber-300' },
  'Hasil Laut & Olahan': { label: 'Baru', color: 'bg-indigo-100 text-indigo-800 border border-indigo-300' },
  'Pertanian & Perkebunan': { label: 'Ternak', color: 'bg-lime-100 text-lime-900 border border-lime-300' },
  'Fashion Muslim': { label: 'Hot', color: 'bg-rose-100 text-rose-800 border border-rose-300' },
  'Herbal & Jamu': { label: 'Tradisional', color: 'bg-violet-100 text-violet-800 border border-violet-300' },
  'Jasa & Layanan': { label: 'Layanan', color: 'bg-sky-100 text-sky-800 border border-sky-300' },
};

export const POPULAR_TAGS = [
  'Rengginang Lorjuk',
  'Batik Tulis Madura',
  'Petis Cakalang',
  'Gula Siwalan',
  'Terasi Rebon',
  'Kerupuk Ikan',
  'Madu Hutan',
  'Jamu Ramuan',
  'Kopyah Santri',
  'Kripik Singkong',
];

export const TARGET_MVP_PRODUCTS = 50;

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

export const SITE_CONFIG = {
  name: 'Mamasar',
  tagline: 'Direktori Iklan Baris UMKM Nahdliyin Kabupaten Sumenep',
  description:
    'Direktori Resmi Produk UMKM Nahdliyin Kabupaten Sumenep. Temukan produk lokal tetangga, transaksi langsung via WhatsApp tanpa perantara.',
  defaultOgImage: '/og-image.jpg',
  organization: 'PCNU Kabupaten Sumenep',
  whatsappHelp: getEnv('WHATSAPP_HELP') || '6282334455667',
  address: 'Jl. Trunojoyo No. 45, Gedung PCNU Kabupaten Sumenep, Jawa Timur',
};
