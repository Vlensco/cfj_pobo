# Catatan Perubahan #012: Alur Checkout Smart-Auth (Login/Register Saat Checkout) & Penjelasan Struktur Admin

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Mengubah alur checkout agar pengunjung dapat bebas menjelajah katalog tanpa terganggu permintaan login awal.
2. Menampilkan prompt **Login / Register / Guest Checkout** secara mulus di dalam *Cart Drawer* hanya saat pengunjung menekan tombol *"Request these pieces"*.
3. Menyediakan opsi **Continue with Google**, **Registrasi Nama & Email**, atau **Continue as Guest** yang langsung mengisikan data (*autofill*) ke formulir order request.
4. Mendokumentasikan panduan lengkap struktur dan navigasi area Admin (`/admin/login`, `/admin/orders`, `/admin/catalog`).

---

## 1. Breakdown Perubahan

### A. Alur Smart-Auth pada Cart Drawer ([`client/src/components/StoreShell.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/components/StoreShell.tsx))
- **Browsing Bebas**: Pengunjung tidak dipaksa login saat pertama kali membuka website (`/`, `/shop`, `/campaign`, `/journal`).
- **Tahap Auth di Drawer (`stage = "auth"`)**:
  - Saat menekan *"Request these pieces"*, jika customer belum login:
    - Opsi **Continue with Google** (Quick OAuth)
    - Formulir input nama & email untuk akun baru / sign-in
    - Opsi **Continue as Guest** (langsung ke form tanpa akun)
  - Jika sudah login, langsung diarahkan ke form request dengan nama dan email terisi otomatis.

### B. Backend Customer Auth ([`server/routers.ts`](file:///d:/Portofolio/Website/Pobo/server/routers.ts))
- Ditambahkan mutasi tRPC `auth.loginCustomer` untuk mendaftarkan user peran `user` ke database dan memasang cookie sesi aman.

---

## 2. Panduan & Struktur Area Admin

| Halaman | URL | Fungsi Utama |
| :--- | :--- | :--- |
| **Admin Login** | [`/admin/login`](http://localhost:3000/admin/login) | Gerbang autentikasi staf/kurator dengan tombol Google Sign-In & Direct Staff Login. Melindungi seluruh dashboard admin dari akses tidak sah. |
| **Order Dashboard** | [`/admin/orders`](http://localhost:3000/admin/orders) | Pengelolaan pesanan customer: ubah status (`New` $\rightarrow$ `Contacted` $\rightarrow$ `Closed`), filter tanggal, export data ke Excel (.xlsx) / CSV, grafik tren harian, dan live leaderboard **Add-to-Bag Telemetry**. |
| **Catalog CMS** | [`/admin/catalog`](http://localhost:3000/admin/catalog) | Manajemen katalog produk langsung ke PostgreSQL: Tambah produk baru (+ form modal), Edit produk, dan Hapus produk. |

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `17 file uji, 44 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Berjalan aktif dan responsif.
