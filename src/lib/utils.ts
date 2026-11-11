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
}): string {
  const cleanPhone = formatPhoneForWhatsApp(params.phone);
  const formattedPrice = formatRupiah(params.price);

  let message = `Halo *${params.storeName}*,\n\nSaya melihat produk Anda di *Mamasar*:\n📦 *Produk:* ${params.productName}\n💰 *Harga:* ${formattedPrice}`;

  if (params.zoneName) {
    message += `\n📍 *Wilayah:* ${params.zoneName}`;
  }

  if (params.productUrl) {
    message += `\n🔗 *Link:* ${params.productUrl}`;
  }

  message += `\n\nApakah barang ini masih tersedia dan bisa dikirim ke alamat saya? Terima kasih.`;

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
