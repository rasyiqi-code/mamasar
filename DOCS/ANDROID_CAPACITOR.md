# Panduan Rilis Aplikasi Android (Capacitor & PWA)

Dokumen ini menjelaskan arsitektur, strategi implementasi, dan langkah teknis untuk mengemas aplikasi web **Pasar Warga NU Sumenep** menjadi aplikasi native Android (`.apk` / `.aab`) menggunakan **Capacitor**, serta opsi distribusi instan berbasis **Progressive Web App (PWA)**.

## Status di repositori

- `capacitor.config.json` sudah ada di root dengan `appId` `id.or.nusumenep.mamasar`, `webDir` `dist/client`, dan URL produksi `https://umkm.nusumenep.or.id`.
- `public/manifest.webmanifest` dan `public/icon.svg` sudah tersedia.
- Direktori `android/` belum di-commit. Langkah `npx cap add android` di bawah akan membuatnya.
- Dependensi Capacitor belum tercantum di `package.json`. Pasang lewat perintah di Langkah 1 sebelum build native.

---

## 🎯 Strategi Arsitektur: Hosted App Pattern

Aplikasi Pasar Warga NU menggunakan arsitektur **Astro Server-Side Rendering (SSR)** dan database terpusat **SQLite (`better-sqlite3`)** di server Node.js.

Catatan deployment: di Vercel, SQLite disimpan di `/tmp` dan tidak persisten. Untuk data yang bertahan, gunakan hosting Node dengan volume persisten atau pindahkan CRUD ke Neon Postgres. Lihat `DOCS/INFRASTRUCTURE_VERCEL_NEON_IMAGEKIT.md`.

Oleh karena itu, strategi Android yang digunakan adalah **Hosted App Mode (Remote Server URL)**:
* Aplikasi Android native membungkus URL produksi resmi (contoh: `https://umkm.nusumenep.or.id`) ke dalam runtime WebView Android berkecepatan tinggi.
* **Keuntungan Utama:**
  1. **Zero Database Refactoring**: Backend Node.js dan SQLite tetap aman di server, data tersinkronisasi realtime untuk seluruh warga dan agen se-Sumenep.
  2. **Pembaruan Instan (Over-The-Air / OTA)**: Setiap pembaruan kode, fitur baru, atau perbaikan bug di web server **langsung aktif di HP pengguna** tanpa perlu mengompilasi ulang atau merilis update APK ke Google Play Store.
  3. **Akses Fitur Perangkat Keras Native**: Tetap dapat mengakses fitur native seperti Kamera HP (untuk agen lapangan), WhatsApp Intent, Push Notification (FCM), dan Haptics.
  4. **Ekspor APK & AAB**: Dapat didistribusikan langsung via file `.apk` di grup WhatsApp warga NU, maupun diunggah resmi ke Google Play Store.

---

## ⚙️ Spesifikasi Konfigurasi Capacitor

### 1. File Konfigurasi: `capacitor.config.json`

```json
{
  "appId": "id.or.nusumenep.mamasar",
  "appName": "Pasar Warga NU",
  "webDir": "dist/client",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://umkm.nusumenep.or.id",
    "cleartext": false,
    "allowNavigation": [
      "umkm.nusumenep.or.id",
      "*.whatsapp.com",
      "wa.me"
    ]
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#059669",
      "showSpinner": false,
      "androidSplashResourceName": "splash"
    }
  }
}
```

---

## 🚀 Langkah Instalasi & Build APK Android

### Prasyarat
* Node.js v20+ terpasang.
* Android Studio (disarankan versi Flamingo / Iguana / Ladybug terbaru) & Android SDK.
* JDK 17 atau 21.

### Langkah 1: Install Dependensi Capacitor
Jalankan di root repositori:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/camera @capacitor/splash-screen @capacitor/app
```

### Langkah 2: Build Web
Kapasitor menyalin isi `webDir` saat `cap sync`, jadi build dulu:

```bash
npm run build
```

Hasil build Astro berada di `dist/`. Folder `dist/client` dipakai sebagai `webDir` sesuai `capacitor.config.json`.

### Langkah 3: Inisialisasi Proyek Capacitor
```bash
npx cap init "Pasar Warga NU" "id.or.nusumenep.mamasar" --web-dir dist/client
```

### Langkah 4: Tambahkan Platform Android
```bash
npx cap add android
```
Perintah ini akan membuat direktori native `android/` yang berisi proyek Gradle lengkap.

### Langkah 5: Konfigurasi Izin Native (`AndroidManifest.xml`)
Pastikan file `android/app/src/main/AndroidManifest.xml` menyertakan izin akses internet, kamera, dan intent WhatsApp:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Akses Jaringan & Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Kamera untuk Form Agen Lapangan -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application ...>
        <!-- Package WhatsApp Intent Query (Android 11+) -->
        <queries>
            <package android:name="com.whatsapp" />
            <package android:name="com.whatsapp.w4b" />
            <intent>
                <action android:name="android.intent.action.VIEW" />
                <data android:scheme="https" android:host="wa.me" />
            </intent>
        </queries>
    </application>
</manifest>
```

### Langkah 6: Buka Android Studio & Build APK
```bash
# Sinkronkan konfigurasi web ke direktori android
npx cap sync android

# Buka proyek di Android Studio
npx cap open android
```
Di Android Studio:
1. Pilih menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)** untuk testing rilis mandiri.
2. File output `.apk` siap diinstal di ponsel Android mana saja.
3. Untuk rilis Play Store: Pilih **Generate Signed Bundle / APK** > pilih **Android App Bundle (.aab)**.

---

## 📲 Opsi Distribusi Instan: Progressive Web App (PWA)

Selain APK native, pengguna ponsel dapat menginstal aplikasi tanpa perlu masuk ke Google Play Store via PWA:

1. **Manifest File (`public/manifest.webmanifest`)**:
   - Menentukan warna tema (`#059669` hijau NU), nama aplikasi, dan ikon aplikasi.
2. **Pengalaman Pengguna**:
   - Saat warga membuka web di Chrome / Samsung Internet di HP Android, muncul banner:
     *"Tambahkan Pasar Warga NU ke Layar Utama"*.
   - Sekali klik, ikon aplikasi langsung terpasang di homescreen HP, berjalan *full screen* tanpa bilah alamat URL browser.
   - Ukuran instalasi sangat hemat: **< 1 MB**.
