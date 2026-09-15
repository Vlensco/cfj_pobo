# Catatan Perubahan #010: Halaman Campaign & Journal Editorial, Sistem Login Admin Google/Local, Manajemen Katalog Produk (CMS), dan Tracking Add-to-Bag

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Mengisi konten halaman **Campaign** dan **Journal** dengan materi editorial visual berkualitas tinggi, narasi sepak bola klasik (*turnstile, concourse light, brutalist architecture*), galeri lookbook foto asli, artikel studi kain, serta pembaca modal interaktif.
2. Membangun halaman **Login Admin (`/admin/login`)** dengan dukungan Google OAuth dan opsi *1-Click Instant Staff Sign-In* (lokal) yang melindungi akses ke seluruh rute admin.
3. Membangun halaman **Manajemen Katalog Produk (CMS - `/admin/catalog`)** untuk menambah, mengedit, dan menghapus produk di PostgreSQL database secara visual.
4. Mengimplementasikan **Sistem Pelacakan Real-time (Add-to-Bag Telemetry & Conversion Ranking)** untuk memantau berapa kali pengunjung memasukkan produk tertentu ke keranjang belanja beserta widget visual pada Dashboard Admin.

---

## 1. Breakdown Perubahan

### A. Konten Campaign & Lookbook Visual ([`client/src/pages/Campaign.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Campaign.tsx))
- **Hero & Manifesto**: Narasi Issue 001 (*"The Long Way to the Turnstile"*) dengan fotografi beresolusi tinggi.
- **Editorial Mosaic Grid**: Visual showcase *Junction Long Sleeve*, *Interval Track Jacket*, *Archive Knit Polo*, dan *Halfway Cap*.
- **Pillars of Production**: Penjelasan filosofi *Small Batch Runs*, *Architectural Cuts*, dan *Subtle Identity*.
- **Matchday Sequence Log**: Garis waktu matchday (*17:15 Underpass*, *18:02 Corner Pub*, *18:42 Turnstile*).

### B. Artikel Journal & Pembaca Interaktif ([`client/src/pages/Journal.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Journal.tsx))
- **Arsip Artikel**: 4 artikel mendalam (*"The Long Way to the Turnstile"*, *"Heavyweights & High Collars"*, *"The Geometry of Stadium Concrete"*, *"The Small Batch Manifesto"*).
- **Filter Kategori**: *All*, *Field Notes*, *Fabric Studies*, *Culture*, *Lookbooks*.
- **Interactive Reader Modal**: Membaca artikel lengkap dalam modal elegan tanpa berpindah halaman.
- **Formulir Berlangganan Newsletter**: Formulir direct correspondence untuk pelanggan.

### C. Autentikasi & Gerbang Login Admin ([`client/src/pages/AdminLogin.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminLogin.tsx))
- Rute `/admin/login` dengan tampilan minimalis mewah.
- Tombol **Continue with Google** dan formulir **Direct Staff Sign-in**.
- Proteksi route di `/admin/orders` dan `/admin/catalog` yang mengarahkan user belum login ke `/admin/login`.
- Prosedur tRPC `auth.loginLocalAdmin` & `auth.logout` dengan session cookie aman.

### D. Manajemen Katalog Produk CMS ([`client/src/pages/AdminCatalog.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminCatalog.tsx))
- Tabel produk interaktif terhubung ke PostgreSQL: Thumbnail, Judul, Kategori, Handle, Harga IDR, Status, dan Aksi.
- **Modal Tambah Produk**: Form input judul, slug otomatis, harga IDR, kategori, URL gambar, dan deskripsi narasi.
- **Modal Edit Produk**: Pengubahan harga, kategori, gambar, atau deskripsi.
- **Aksi Hapus Produk**: Penghapusan data produk beserta varian dan gambarnya.

### E. Pelacakan Add-to-Bag & Visual Telemetry
- **Schema Database** ([`drizzle/schema.ts`](file:///d:/Portofolio/Website/Pobo/drizzle/schema.ts)): Tabel `product_analytics_events` untuk merekam event `add_to_bag` dengan informasi produk, warna, ukuran, dan harga.
- **tRPC Router** ([`server/routers/analytics.ts`](file:///d:/Portofolio/Website/Pobo/server/routers/analytics.ts)): Prosedur `analytics.trackEvent` dan `analytics.getStats`.
- **Integrasi Storefront** ([`client/src/pages/ProductPage.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/ProductPage.tsx)): Mengirim event otomatis saat tombol *Add to bag* ditekan.
- **Widget Dashboard** ([`client/src/pages/AdminOrders.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminOrders.tsx)): Leaderboard *Most Added Pieces to Bag* dan counter metrik harian/total.

---

## 2. File yang Dimodifikasi & Ditambahkan

1. **[NEW]** `docs/changes/010_campaign_journal_admin_auth_cms_and_add_to_bag_tracking.md`
2. **[NEW]** `client/src/pages/Campaign.tsx`
3. **[NEW]** `client/src/pages/Journal.tsx`
4. **[NEW]** `client/src/pages/AdminLogin.tsx`
5. **[NEW]** `client/src/pages/AdminCatalog.tsx`
6. **[NEW]** `server/routers/analytics.ts`
7. **[NEW]** `server/routers/adminProducts.ts`
8. **[NEW]** `server/analytics.test.ts`
9. **[MODIFY]** `drizzle/schema.ts`
10. **[MODIFY]** `server/db.ts`
11. **[MODIFY]** `server/routers.ts`
12. **[MODIFY]** `client/src/App.tsx`
13. **[MODIFY]** `client/src/components/StoreShell.tsx`
14. **[MODIFY]** `client/src/pages/ProductPage.tsx`
15. **[MODIFY]** `client/src/pages/AdminOrders.tsx`
16. **[MODIFY]** `client/src/overrides.css`
17. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `17 file uji, 44 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses ter-compile di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Seluruh endpoint (`/`, `/shop`, `/campaign`, `/journal`, `/admin/login`, `/admin/catalog`, `/admin/orders`) aktif mengembalikan HTTP 200 OK.
