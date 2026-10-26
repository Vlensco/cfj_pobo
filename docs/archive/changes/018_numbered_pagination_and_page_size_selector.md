# Catatan Perubahan #018: Penerapan Paginasi Bernomor & Pengaturan Jumlah Item (10 / 15 Per Halaman) Per Section

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Menambahkan paginasi bernomor (*numbered pagination*: `1, 2, 3...`, `Previous`, `Next`) pada seluruh halaman daftar: **Shop Publik (`/shop`)**, **CMS Katalog Admin (`/admin/catalog`)**, dan **Manajemen Pesanan Admin (`/admin/orders`)**.
2. Menyediakan tombol switch pemilihan jumlah item per halaman (**10** dan **15** item per halaman di Admin, serta **6**, **12**, **18** di Storefront).
3. Membagi tata letak admin menjadi section-section yang terstruktur rapi (Section Toolbar & Filter, Section Tabel Data, Section Paginasi & Total Ringkasan).

---

## 1. Breakdown Perubahan

### A. Backend tRPC & Database Count ([`server/db.ts`](file:///d:/Portofolio/Website/Pobo/server/db.ts) & [`server/routers/adminProducts.ts`](file:///d:/Portofolio/Website/Pobo/server/routers/adminProducts.ts))
- Menambahkan fungsi `countDbProducts` di `db.ts` untuk menghitung total produk berdasarkan filter pencarian dan kategori.
- Query `adminProducts.list` kini mengembalikan `total`, `totalPages`, `page`, dan `pageSize` secara akurat.

### B. CMS Katalog Admin ([`client/src/pages/AdminCatalog.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminCatalog.tsx))
- Menambahkan state `pageSize: 10 | 15` dengan tombol pemilih per halaman di toolbar.
- Menambahkan paginasi bernomor di bagian bawah tabel dengan indikator halaman aktif dan ringkasan *"Showing X–Y of Z pieces"*.

### C. Manajemen Pesanan Admin ([`client/src/pages/AdminOrders.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminOrders.tsx))
- Menambahkan pemilih `10` / `15` pesanan per halaman dan tombol paginasi bernomor yang terintegrasi dengan filter status, tanggal, dan pencarian.

### D. Halaman Toko Publik ([`client/src/pages/Shop.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Shop.tsx))
- Menambahkan sistem paginasi bernomor dan pemilih jumlah item (6 / 12 / 18 per halaman) yang secara otomatis reset ke halaman 1 saat filter atau kata kunci pencarian diubah.

### E. Desain CSS Responsif ([`client/src/overrides.css`](file:///d:/Portofolio/Website/Pobo/client/src/overrides.css))
- Menambahkan gaya `.pagination-section`, `.pagination-controls`, `.pagination-summary`, dan `.page-size-selector` dengan transisi halus dan desain mewah.

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/018_numbered_pagination_and_page_size_selector.md`
2. **[MODIFY]** `server/db.ts`
3. **[MODIFY]** `server/routers/adminProducts.ts`
4. **[MODIFY]** `client/src/pages/AdminCatalog.tsx`
5. **[MODIFY]** `client/src/pages/AdminOrders.tsx`
6. **[MODIFY]** `client/src/pages/Shop.tsx`
7. **[MODIFY]** `client/src/overrides.css`
8. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `17 file uji, 44 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Paginasi bernomor dan switcher 10/15 berjalan mulus.
