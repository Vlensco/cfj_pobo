# Catatan Perubahan #005: Auto Scroll-to-Top Saat Navigasi & Membuka Produk

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Mengimplementasikan fitur auto scroll-to-top yang otomatis mengembalikan posisi scroll ke bagian paling atas layar saat pengguna menekan "View piece", berpindah produk di section "Other pieces", atau bernavigasi antar halaman (`/`, `/shop`, `/products/:slug`).
2. Menghindari posisi layar tertahan di bagian tengah/bawah saat membuka halaman produk baru.

---

## 1. Breakdown Perubahan

### A. Komponen Global ScrollToTop (`client/src/components/ScrollToTop.tsx`)
- Membuat komponen pemantau rute berbasis `wouter` (`useLocation`):
  - Saat URL rute berubah, mengeksekusi `window.scrollTo({ top: 0, left: 0, behavior: "smooth" })`.
- Dimuat di tingkat router utama [`client/src/App.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/App.tsx).

### B. Handler Rute Detail Produk (`client/src/pages/ProductPage.tsx`)
- Menambahkan `useEffect` yang memantau perubahan parameter `slug` (`params?.slug`):
  - Mengatur ulang pilihan warna ke default produk.
  - Mengatur ulang ukuran dan indeks galeri foto ke index 0.
  - Menggulirkan layar ke atas secara halus (`smooth scroll to top`).

---

## 2. File yang Dibuat / Dimodifikasi

1. **[NEW]** `client/src/components/ScrollToTop.tsx`
2. **[NEW]** `docs/changes/005_auto_scroll_to_top_on_navigation.md`
3. **[MODIFY]** `client/src/App.tsx`
4. **[MODIFY]** `client/src/pages/ProductPage.tsx`
5. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error`.
- **Vitest Tests (`npm run test`)**: `16 test files passed, 41 tests passed` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Berjalan aktif di port 3000.
