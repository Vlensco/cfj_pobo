# Catatan Perubahan #003: Perbaikan Storage Proxy 500 Error & Penambahan Animasi Scroll / Reload

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Memperbaiki error `Failed to load resource: the server responded with a status of 500 (Internal Server Error)` pada endpoint `/manus-storage/*.jpg`.
2. Menyediakan penanganan aset lokal & graceful dynamic SVG visual fallback berkualitas tinggi saat storage proxy tidak terhubung ke API cloud eksternal.
3. Menambahkan animasi scroll (reveal-on-scroll saat memasuki viewport) dan animasi reload/transisi halaman di seluruh storefront.
4. Menambahkan Scroll Progress Bar emas di bagian atas viewport untuk indikator kedalaman scroll.

---

## 1. Breakdown Perubahan

### A. Perbaikan Storage Proxy Backend (`server/_core/storageProxy.ts`)
- Handler `/manus-storage/*` diperbarui:
  - Memeriksa ketersediaan file lokal terlebih dahulu di folder `client/public/manus-storage/` dan `dist/public/manus-storage/`.
  - Jika Forge API tersedia, melakukan proxy URL presigned.
  - Jika aset tidak ditemukan dan Forge API tidak aktif (seperti di local environment), sistem merespons dengan **Status 200 OK** berupa visual SVG editorial bertema football apparel (dark charcoal, gold dashed circle, typography Newsreader & Manrope) sehingga browser tidak pernah menerima status 500.

### B. Komponen Animasi Motion (`client/src/components/MotionReveal.tsx`)
- Membuat komponen animasi berbasis `framer-motion`:
  - `FadeIn`: Mengangkat elemen (`y: 24 -> 0`) dan memudarkan opasitas (`0 -> 1`) secara halus saat di-scroll ke viewport (`whileInView`).
  - `StaggerContainer` & `StaggerItem`: Mengatur animasi berjenjang (staggered delay) untuk grid produk, koleksi, dan kartu item.
  - `PageEntrance`: Transisi masuk halus saat halaman dimuat ulang (reload) atau saat navigasi rute berubah.
  - `ScrollProgressBar`: Indikator progres scroll halus dengan animasi pegas (`useSpring`) di bagian atas layar.

### C. Implementasi pada Halaman Storefront
- **`StoreShell.tsx`**: Menambahkan `ScrollProgressBar` dan transisi navigasi.
- **`Home.tsx`**: Membungkus Hero, Intro Section, Featured Drop, Campaign, Collection Grid, dan Journal dengan `FadeIn` dan `StaggerContainer`.
- **`Shop.tsx`**: Menambahkan animasi masuk katalog, panel filter, dan staggered animation untuk grid produk.
- **`ProductPage.tsx`**: Menambahkan animasi transisi galeri gambar, detail pembelian, accordions, dan rekomendasi piece terkait.

### D. CSS Styling & Micro-interactions (`client/src/overrides.css`)
- Efek hover lift kartu produk (`translateY(-5px)` dengan bayangan lembut).
- Efek zoom halus gambar Hero saat halaman pertama kali di-reload (`heroZoomIn`).
- Hover lift pada kartu koleksi dan tombol CTA.

---

## 2. File yang Dibuat / Dimodifikasi

1. **[NEW]** `client/src/components/MotionReveal.tsx`
2. **[NEW]** `docs/changes/003_storage_proxy_fix_and_scroll_animations.md`
3. **[MODIFY]** `server/_core/storageProxy.ts`
4. **[MODIFY]** `client/src/components/StoreShell.tsx`
5. **[MODIFY]** `client/src/pages/Home.tsx`
6. **[MODIFY]** `client/src/pages/Shop.tsx`
7. **[MODIFY]** `client/src/pages/ProductPage.tsx`
8. **[MODIFY]** `client/src/overrides.css`
9. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **Asset Endpoints Check**: Seluruh URL `/manus-storage/*.jpg` merespons **Status 200 OK** (0 error 500).
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Test Suite (`npm run test`)**: `16 test files passed, 41 tests passed` (100% Lolos).
- **Build Production (`npm run build`)**: Berhasil dibuat di `dist/`.
- **Server Runtime**: Berjalan lancar di `http://localhost:3000/`.
