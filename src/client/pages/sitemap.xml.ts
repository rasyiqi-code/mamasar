import type { APIRoute } from 'astro';
import { getProducts, getAllUMKM, getArticles, getEvents, getActiveCaseStudies } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const siteUrl = `${url.protocol}//${url.host}`;

  const [products, stores, articles, events, caseStudies] = await Promise.all([
    getProducts({ minPrice: 0, maxPrice: 999999999 }),
    getAllUMKM(),
    getArticles(),
    getEvents(),
    getActiveCaseStudies(),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${siteUrl}/toko</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${siteUrl}/pasang-iklan</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${siteUrl}/kegiatan</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${siteUrl}/edukasi</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${siteUrl}/dasar-syariah</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${siteUrl}/tentang</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>${siteUrl}/syarat-ketentuan</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${siteUrl}/kebijakan-privasi</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${siteUrl}/panduan-petugas</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>${siteUrl}/bantuan</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>${siteUrl}/kontak</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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

  <!-- Video Studi Kasus Inspirasi Usaha -->
  ${caseStudies
    .map(
      (cs) => `
  <url>
    <loc>${siteUrl}/edukasi/video/${cs.id}</loc>
    <lastmod>${cs.created_at ? new Date(cs.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('')}

  <!-- Profil Toko Warga NU -->
  ${stores
    .map(
      (s) => `
  <url>
    <loc>${siteUrl}/toko/${s.slug || s.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')}

  <!-- Halaman Detail Produk -->
  ${products
    .map(
      (p) => `
  <url>
    <loc>${siteUrl}/produk/${p.slug}</loc>
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
