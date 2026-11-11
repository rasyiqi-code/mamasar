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
  'Semua': { label: 'Semua', color: 'bg-slate-500/20 text-slate-400 border border-slate-400/30' },
  'Makanan & Minuman': { label: 'Populer', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  'Batik & Kerajinan': { label: 'Pilihan', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  'Hasil Laut & Olahan': { label: 'Baru', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
  'Pertanian & Perkebunan': { label: 'Ternak', color: 'bg-lime-500/20 text-lime-400 border border-lime-500/30' },
  'Fashion Muslim': { label: 'Hot', color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  'Herbal & Jamu': { label: 'Tradisional', color: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
  'Jasa & Layanan': { label: 'Layanan', color: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
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
