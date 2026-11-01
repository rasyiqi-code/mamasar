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

  let message = `Halo *${params.storeName}*,\n\nSaya melihat produk Anda di *Pasar Digital UMKM NU Sumenep*:\n📦 *Produk:* ${params.productName}\n💰 *Harga:* ${formattedPrice}`;

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
