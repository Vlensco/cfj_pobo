# Catatan Perubahan #008: Penambahan Menu Home dengan Active Underline & Perbaikan Konfigurasi IDE TypeScript

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Menambahkan menu eksplisit **`Home`** pada navbar dengan indikator garis bawah aktif (`border-bottom`) saat pengguna berada di Homepage (`/`).
2. Memperbaiki masalah IDE TypeScript `Cannot find module '@/data/catalog'`, `Cannot find module '@/components/StoreShell'`, dan `Cannot find module 'vitest'` pada file pengujian.

---

## 1. Breakdown Perubahan

### A. Penambahan Menu Home & Indikator Aktif ([`client/src/components/StoreShell.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/components/StoreShell.tsx))
- Navbar kini menampilkan 4 menu:
  $$\text{HOME} \quad\quad \text{SHOP} \quad\quad \text{CAMPAIGN} \quad\quad \text{JOURNAL}$$
- Saat pengguna berada di Homepage (`/`), menu **`Home`** otomatis memiliki garis bawah aktif.
- Saat pengguna berada di `/shop` atau `/products/...`, menu **`Shop`** otomatis memiliki garis bawah aktif.

### B. Perbaikan Konfigurasi IDE TypeScript ([`tsconfig.json`](file:///d:/Portofolio/Website/Pobo/tsconfig.json))
- **Penyebab Bug**: Sebelumnya file uji `**/*.test.ts` dan `**/*.test.tsx` berada di daftar `exclude` di `tsconfig.json`, sehingga Language Server IDE mengabaikan pemetaan path alias `@/*` dan tipe global `vitest` saat membuka file pengujian.
- **Solusi**: Menghapus `**/*.test.ts` dan `**/*.test.tsx` dari daftar `exclude` di `tsconfig.json`. Sekarang seluruh file pengujian dikenali sepenuhnya oleh TypeScript compiler dan IDE tanpa error.

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/008_navbar_home_active_state_and_tsconfig_fix.md`
2. **[MODIFY]** `client/src/components/StoreShell.tsx`
3. **[MODIFY]** `tsconfig.json`
4. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Seluruh 100+ file src & test lolos).
- **Vitest Unit Tests (`npm run test`)**: `16 file uji, 41 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Aktif dan berjalan lancar.
