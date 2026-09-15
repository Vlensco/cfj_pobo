# Catatan Perubahan #002: Perbaikan Path Resolver Vite dan Schema Zod

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Memperbaiki error `ENOENT: no such file or directory, open 'D:\Portofolio\Website\client\index.html'` yang terjadi karena path traversal relatif `../..` dari direktori `dist/`.
2. Menjamin kompatibilitas path root proyek menggunakan `process.cwd()` pada `server/_core/vite.ts` dan `vite.config.ts`.
3. Memperbaiki pemisahan Zod schema `.pick()` pada `server/routers/adminOrders.ts` agar kompatibel dengan Zod 4.
4. Menambahkan dependensi `@testing-library/dom` untuk kelulusan seluruh interaction tests.

---

## 1. Breakdown Perubahan

### A. Server Vite Path Resolution (`server/_core/vite.ts`)
- Mengganti `path.resolve(import.meta.dirname, "../..", "client", "index.html")` menjadi `path.resolve(process.cwd(), "client", "index.html")`.
- Mengganti penentuan `distPath` statis menjadi `path.resolve(process.cwd(), "dist", "public")`.
- Hal ini mencegah kesalahan traversal direktori saat aplikasi dijalankan dari bundle `dist/index.js` maupun saat runtime `tsx`.

### B. Konfigurasi Vite (`vite.config.ts`)
- Mengganti `PROJECT_ROOT = import.meta.dirname` menjadi `PROJECT_ROOT = process.cwd()`.
- Menyelaraskan seluruh alias (`@`, `@shared`, `@assets`), `root`, `publicDir`, dan `outDir` ke `PROJECT_ROOT`.

### C. Zod Schema Refinement (`server/routers/adminOrders.ts`)
- Memisahkan `browseBaseSchema = z.object({...})` dasar dengan `browseInput` dan `exportInput` yang memiliki `.refine()`.
- Menggunakan `browseBaseSchema.pick({...})` sehingga tidak error saat Zod melakukan validasi schema.

---

## 2. File yang Dimodifikasi

1. **[MODIFY]** `server/_core/vite.ts`
2. **[MODIFY]** `vite.config.ts`
3. **[MODIFY]** `server/routers/adminOrders.ts`
4. **[MODIFY]** `package.json`

---

## 3. Hasil Verifikasi
- `npm run check`: **0 TypeScript Error**
- `npm run test`: **16/16 Test Files Passed, 41/41 Tests Passed**
- `npm run build`: **Berhasil membuat bundle produksi tanpa error**
- `npm run dev`: **Server aktif di `http://localhost:3000/` dan merespons `Status 200 OK`**.
