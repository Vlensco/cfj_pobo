# Catatan Perubahan #006: Peningkatan Navigasi Antar Halaman & Tombol Kembali ke Homepage

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Menyediakan cara yang jelas dan mudah bagi pengguna untuk kembali ke Homepage (`/`) dari halaman mana pun.
2. Memperbaiki link navigasi navbar dan footer agar mendukung navigasi lintas halaman (*cross-page deep linking*).

---

## 1. Breakdown Perubahan

### A. Penambahan Tombol Menu "Home" & Cross-Page Routing ([`client/src/components/StoreShell.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/components/StoreShell.tsx))
- Menambahkan tautan eksplisit **`Home`** pada menu navbar:
  ```tsx
  <nav className="site-nav">
    <Link href="/">Home</Link>
    <Link href="/shop">Shop</Link>
    <Link href="/#campaign">Campaign</Link>
    <Link href="/#journal">Journal</Link>
  </nav>
  ```
- Logo **`TERRACE`** di bagian tengah header tetap menjadi tombol utama untuk kembali ke Homepage (`/`).
- Tautan **`Campaign`** (`/#campaign`) dan **`Journal`** (`/#journal`) diubah menjadi format root hash link, sehingga ketika pengguna berada di `/shop` atau `/products/:slug`, mengklik menu tersebut akan membawa pengguna kembali ke Homepage dan menggulirkan layar ke section yang dituju.
- Tautan footer juga diperbarui ke format yang sama.

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/006_navbar_cross_page_navigation_enhancement.md`
2. **[MODIFY]** `client/src/components/StoreShell.tsx`
3. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Cara Kembali ke Homepage:
1. **Klik Teks Logo `TERRACE`** di bagian tengah atas header (selalu aktif di semua halaman).
2. **Klik Menu `Home`** di navbar kiri atas.
3. **Klik Menu `Campaign` atau `Journal`** untuk kembali ke Homepage pada section cerita rilis.
4. **Klik Tautan `All pieces` / `Discover the drop`** dari dalam halaman produk atau shopping bag.
