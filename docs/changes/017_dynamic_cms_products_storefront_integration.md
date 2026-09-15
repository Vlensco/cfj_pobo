# Catatan Perubahan #017: Integrasi Dinamis Data Produk dari Database CMS ke Seluruh Halaman Toko

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Menghubungkan seluruh halaman utama toko (**Home**, **Shop**, dan **Product Details**) ke database PostgreSQL / API CMS (`trpc.adminProducts`).
2. Menampilkan seluruh data produk, jersey vintage, jaket, polo, dan patch dari database secara dinamis dan real-time.
3. Setiap kali produk ditambahkan, diedit, atau dihapus melalui CMS (`/admin/catalog`), perubahan tersebut akan langsung tercermin secara instan di halaman publik toko (`/shop`, `/`, dan `/products/:slug`).

---

## 1. Breakdown Perubahan

### A. Konverter Data Produk ([`client/src/data/catalog.ts`](file:///d:/Portofolio/Website/Pobo/client/src/data/catalog.ts))
- Menambahkan helper `dbProductToStoreProduct` yang memetakan entitas database PostgreSQL (judul, harga IDR, varian, gambar primer, dan deskripsi) ke dalam struktur kartu produk storefront.

### B. Halaman Shop Dinamis ([`client/src/pages/Shop.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Shop.tsx))
- Mengambil data katalog via query tRPC `adminProducts.list` (`pageSize: 100`).
- Mendukung filter pencarian kata kunci, kategori studi, filter rentang harga, dan pengurutan (*Sort*) secara responsif langsung pada data live CMS.

### C. Halaman Beranda Dinamis ([`client/src/pages/Home.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Home.tsx))
- Mengambil koleksi unggulan (*Featured Drop*) terbaru dari database CMS secara otomatis.

### D. Halaman Detail Produk Dinamis ([`client/src/pages/ProductPage.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/ProductPage.tsx))
- Mengambil detail spesifik produk berdasarkan slug/handle via `adminProducts.getDetails` serta menampilkan 3 produk terkait (*related pieces*) yang sinkron dengan database.

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/017_dynamic_cms_products_storefront_integration.md`
2. **[MODIFY]** `client/src/data/catalog.ts`
3. **[MODIFY]** `client/src/pages/Shop.tsx`
4. **[MODIFY]** `client/src/pages/Home.tsx`
5. **[MODIFY]** `client/src/pages/ProductPage.tsx`
6. **[MODIFY]** `client/src/pages/Storefront.interaction.test.tsx`
7. **[MODIFY]** `client/src/pages/ProductPage.interaction.test.tsx`
8. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `17 file uji, 44 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Seluruh katalog dari CMS tampil lengkap di halaman `/shop` dan `/`.
