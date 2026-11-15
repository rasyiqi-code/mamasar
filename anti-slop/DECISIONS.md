# Keputusan Desain & Tradeoff Arsitektur (Mamasar)

Dokumen ini mencatat keputusan arsitektur dan UX yang dipilih secara sadar (beserta alasan dan batasannya) agar konsistensi visual, aksesibilitas, dan operasional tetap terjaga di seluruh halaman (`R-31`).

1. **Transaksi Langsung via WhatsApp (`wa.me`) Tanpa Checkout / Escrow Internal**
   - **Keputusan**: CTA utama di katalog dan halaman produk membuka WhatsApp penjual dengan pesan praterisi (`Chat Penjual`), dan model pendapatan platform bersifat **0% Komisi Transaksi (Layanan Promosi Opsional)**.
   - **Alasan**: Mayoritas UMKM warga NU Sumenep (kuliner, sembako, kerajinan desa) mengandalkan negosiasi ongkir kecamatan/kepulauan, pesan antar lokal, serta pembayaran tunai/transfer langsung tanpa perlu onboarding payment gateway atau rekonsiliasi saldo.
   - **Batas**: Platform fokus pada penemuan lokal, verifikasi kurasi MWC, dan pencatatan kas pribadi toko—bukan pemrosesan pembayaran.

2. **Taksonomi Wilayah Berbasis 24 MWCNU + Ranting Desa (`zone_id` + `ranting`)**
   - **Keputusan**: Filter wilayah dan otorisasi kader memakai struktur 24 kecamatan/wilayah kerja MWCNU Kabupaten Sumenep (beserta label ranting/desa pada toko).
   - **Alasan**: Kurasi toko ("Terverifikasi MWC NU"), alokasi agenda kegiatan (`kegiatan`), dan otorisasi `can()` kader (`pcnu`, `mwcnu`, `ranting`) menempel langsung ke struktur organisasi NU di tingkat kecamatan dan desa.

3. **Native `<dialog>.showModal()` & `@theme` CSS Tokens Tanpa Library UI Berat**
   - **Keputusan**: Seluruh modal konfirmasi, edit produk, form promosi, QR label, dan agenda menggunakan elemen HTML `<dialog>` standar (`showModal()`) dengan `@theme` token di `src/styles/global.css`.
   - **Alasan**: Top-layer browser native otomatis menangani `Escape`, fokus awal (`autofocus` pada tombol aman), dan inert background tanpa bundle JS ekstra atau penguncian scroll body manual.

4. **Server-Side Rendering (Astro SSR) + Hydrasi Island Minimal**
   - **Keputusan**: Katalog, detail produk/toko, dan portal dirender SSR dari Neon PostgreSQL dengan cache baca singkat (`60s` + invalidasi mutasi), sementara skrip klien terfokus pada galeri foto, filter lokal favorit, buku kas, dan manajemen modal.
   - **Alasan**: Menjamin SEO lengkap (canonical URL bersih, JSON-LD `Product`/`Event`/`Article`), beban JS rendah di HP kelas menengah warga, dan konsistensi kontrol akses server.

5. **Peta Sebaran Wilayah Bundel Lokal (`leaflet` npm + `CircleMarker` Vektor)**
   - **Keputusan**: Peta MWC NU pada portal pengurus membundel `leaflet` secara lokal (`L.circleMarker`) dengan panel daftar wilayah interaktif di sampingnya sebagai cadangan saat ubin peta eksternal diblokir/offline.
   - **Alasan**: Menghilangkan ketergantungan skrip CDN `unpkg.com` dan ikon PNG default Leaflet yang rawan gagal termuat di lingkungan jaringan terbatas atau CSP ketat.
