# Catatan Perubahan #007: Penambahan Garis Bawah Aktif pada Navigasi (Active State Underline)

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Mengembalikan susunan navbar minimalis (`SHOP`, `CAMPAIGN`, `JOURNAL`) sesuai visual editorial brand.
2. Memberikan indikator garis bawah aktif (`border-bottom`) yang jelas saat pengguna berada di halaman atau menu tertentu (misalnya menu `SHOP` bergaris bawah saat berada di `/shop` atau `/products/*`).

---

## 1. Breakdown Perubahan

### A. Navigasi & Status Aktif ([`client/src/components/StoreShell.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/components/StoreShell.tsx))
- Memanfaatkan hook `useLocation()` dari `wouter` untuk mendeteksi rute saat ini.
- Menambahkan kelas `active` pada tautan menu:
  - Menu `Shop` mendapatkan kelas `active` saat rute berada di `/shop` atau `/products/:slug`.
  ```tsx
  <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
    <Link href="/shop" className={isShopActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Shop</Link>
    <Link href="/#campaign" onClick={() => setMenuOpen(false)}>Campaign</Link>
    <Link href="/#journal" onClick={() => setMenuOpen(false)}>Journal</Link>
  </nav>
  ```

### B. Styling Garis Bawah Navigasi ([`client/src/overrides.css`](file:///d:/Portofolio/Website/Pobo/client/src/overrides.css))
- Menambahkan aturan CSS:
  ```css
  .site-nav {
    gap: 28px;
  }
  .site-nav a {
    position: relative;
    color: #747570;
    padding: 4px 0;
    transition: color 0.18s ease, border-color 0.18s ease;
  }
  .site-nav a:hover {
    color: var(--ink);
  }
  .site-nav a.active {
    color: var(--ink);
    font-weight: 700;
    border-bottom: 1.5px solid var(--ink);
  }
  ```

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/007_navbar_active_underline_indicators.md`
2. **[MODIFY]** `client/src/components/StoreShell.tsx`
3. **[MODIFY]** `client/src/overrides.css`
4. **[MODIFY]** `client/src/pages/Storefront.interaction.test.tsx`
5. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `16 file uji, 41 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Aktif dan menyajikan status navbar aktif dengan garis bawah.
