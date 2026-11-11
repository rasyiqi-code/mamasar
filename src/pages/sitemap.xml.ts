import type { APIRoute } from 'astro';
import { getProducts, getAllZones, getAllUMKM, getArticles, getEvents } from '../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const siteUrl = `${url.protocol}//${url.host}`;

  // Limiting results for sitemap performance
  const [products, zones, stores, articles, events] = await Promise.all([
    getProducts({ minPrice: 0, maxPrice: 999999999 }), // all products but with sort
    getAllZones(), // all zones - reasonable count
    getAllUMKM(), // all stores - may need pagination later
    getArticles(), // all articles - may need pagination later
    getEvents(), // all events - may need pagination later
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Direktori Toko -->
  <url>
    <loc>${siteUrl}/toko</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Pasang Iklan -->
  <url>
    <loc>${siteUrl}/pasang-iklan</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Direktori Kegiatan & Konsumsi -->
  <url>
    <loc>${siteUrl}/kegiatan</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Pusat Edukasi & Panduan -->
  <url>
    <loc>${siteUrl}/edukasi</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Jadwal Kegiatan & Konsumsi Mamasar -->
  ${events
    .map(
      (e) => `
  <url>
    <loc>${siteUrl}/kegiatan/${e.slug}</loc>
    <lastmod>${e.created_at ? new Date(e.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')}

  <!-- Artikel Edukasi Warga -->
  ${articles
    .map(
      (a) => `
  <url>
    <loc>${siteUrl}/edukasi/${a.slug}</loc>
    <lastmod>${a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')}

  <!-- Profil Toko Warga NU -->
  ${stores
    .map(
      (s) => `
  <url>
    <loc>${siteUrl}/toko/${s.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')}

  <!-- Filter Zona MWC -->
  ${zones
    .map(
      (z) => `
  <url>
    <loc>${siteUrl}/?zona=${z.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('')}

  <!-- Halaman Detail Produk -->
  ${products
    .map(
      (p) => `
  <url>
    <loc>${siteUrl}/p/${p.slug}</loc>
    <lastmod>${p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(xml.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
