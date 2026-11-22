/**
 * Format currency amount into Indonesian Rupiah (IDR)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Normalize an Indonesian phone number to international 62 format
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * Validate whether a given string is a valid Indonesian mobile / WhatsApp phone number.
 * Valid numbers must:
 * - Start with 08, 628, +628, or 8 (followed by 1-9)
 * - Contain 10 to 14 digits in total
 */
export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/\D/g, '');

  // Indonesian mobile numbers are between 10 and 14 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 14) {
    return false;
  }

  // Check prefix: 08xxx (9-13 digits after 08 = total 10-14), 628xxx (9-13 digits after 628 = total 11-14), 8xxx (9-12 digits = total 10-13)
  // Normalize: strip leading + if present, ensure starts with 62 or 0 for consistency
  const normalized = digitsOnly.replace(/^\+/, '');

  // Valid prefixes after normalization:
  // - 08 followed by 8-13 more digits (total 10-14)  
  // - 628 followed by 8-13 more digits (total 11-14)
  // - 8 followed by 9-12 more digits (total 10-13)
  return /^(08[1-9]\d{8,13}|628[1-9]\d{8,13}|8[1-9]\d{9,12})$/.test(normalized);
}

/**
 * Format phone number into human-friendly format (e.g., +62 812-3456-7890)
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = formatPhoneForWhatsApp(phone);
  if (normalized.length >= 11) {
    const country = normalized.slice(0, 2);
    const prefix = normalized.slice(2, 5);
    const middle = normalized.slice(5, 9);
    const rest = normalized.slice(9);
    return `+${country} ${prefix}-${middle}-${rest}`;
  }
  return phone;
}

/**
 * Generate a friendly WhatsApp direct-chat URL with pre-filled product context
 */
export function createProductWhatsAppUrl(params: {
  phone: string;
  storeName: string;
  productName: string;
  price: number;
  zoneName?: string;
  productUrl?: string;
  orderLeadTimeDays?: number;
  minOrder?: number;
  stockStatus?: string;
}): string {
  const cleanPhone = formatPhoneForWhatsApp(params.phone);
  const formattedPrice = formatRupiah(params.price);

  let message = `Halo *${params.storeName}*,\n\nSaya melihat produk Anda di *Mamasar*:\n📦 *Produk:* ${params.productName}\n💰 *Harga:* ${formattedPrice}`;

  if (params.zoneName) {
    message += `\n📍 *Wilayah:* ${params.zoneName}`;
  }

  if (params.stockStatus === 'po' || (params.orderLeadTimeDays !== undefined && params.orderLeadTimeDays > 0)) {
    const days = params.orderLeadTimeDays || 1;
    message += `\n⏱️ *Estimasi PO:* H-${days}`;
  }

  if (params.minOrder && params.minOrder > 1) {
    message += `\n🛒 *Minimal Pesan:* ${params.minOrder} pcs/porsi`;
  }

  if (params.productUrl) {
    message += `\n🔗 *Link:* ${params.productUrl}`;
  }

  message += `\n\nApakah barang ini bisa dipesan? Terima kasih.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Convert string into a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Generates an ImageKit transformation URL when the image is hosted on ik.imagekit.io.
 * Passes through local/other origins untouched.
 */
export function getOptimizedImageUrl(url: string, width: number): string {
  if (!url || !url.includes('ik.imagekit.io')) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('tr', `w-${width},f-auto,q-80`);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Detects marketplace platform from URL and returns appropriate name, CTA label, and styling.
 * Supports Shopee, Tokopedia, TikTok Shop, Lazada, Blibli, Bukalapak, or general online store.
 */
export function getMarketplaceInfo(url?: string | null): { name: string; label: string; bgClass: string } | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('shopee') || lower.includes('shp.ee')) {
    return { name: 'Shopee', label: 'Beli di Shopee', bgClass: 'bg-[#ee4d2d] hover:bg-[#d73211] text-white' };
  }
  if (lower.includes('tokopedia') || lower.includes('tokopedia.link')) {
    return { name: 'Tokopedia', label: 'Beli di Tokopedia', bgClass: 'bg-[#03ac0e] hover:bg-[#028a0b] text-white' };
  }
  if (lower.includes('tiktok.com')) {
    return { name: 'TikTok Shop', label: 'Beli di TikTok Shop', bgClass: 'bg-slate-900 hover:bg-black text-white' };
  }
  if (lower.includes('lazada')) {
    return { name: 'Lazada', label: 'Beli di Lazada', bgClass: 'bg-[#0f146d] hover:bg-[#0a0d4c] text-white' };
  }
  if (lower.includes('blibli')) {
    return { name: 'Blibli', label: 'Beli di Blibli', bgClass: 'bg-[#0095da] hover:bg-[#007bb5] text-white' };
  }
  if (lower.includes('bukalapak')) {
    return { name: 'Bukalapak', label: 'Beli di Bukalapak', bgClass: 'bg-[#e31f51] hover:bg-[#b81841] text-white' };
  }
  return { name: 'Toko Online', label: 'Buka Toko Online', bgClass: 'bg-slate-800 hover:bg-slate-900 text-white' };
}

/**
 * Builds responsive srcset strings for ImageKit-hosted product images.
 */
export function getImageSrcSet(url?: string | null): string | undefined {
  if (!url || !url.includes('ik.imagekit.io')) return undefined;
  return `${getOptimizedImageUrl(url, 400)} 400w, ${getOptimizedImageUrl(url, 800)} 800w`;
}
