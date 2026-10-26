# Catatan Perubahan #009: Penyesuaian Layout Dua Kolom Editorial Bagian Atas Halaman Shop

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Menyusun ulang layout bagian atas halaman Shop (`/shop`) agar persis seperti visual screenshot yang diinginkan:
   - Kolom Kiri: Eyebrow `01 / THE FIRST RELEASE` di atas judul besar *"For the hours around the game."*.
   - Kolom Kanan (rata bawah): Paragraf deskripsi *"Original pieces in four quiet movements. Designed in small runs, worn long after the final whistle."*.
2. Memperbaiki nesting animasi `FadeIn` agar tidak memecah layout grid dua kolom.

---

## 1. Breakdown Perubahan

### A. Struktur JSX Bagian Atas Shop ([`client/src/pages/Shop.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/Shop.tsx))
- Mengelompokkan elemen judul ke dalam dua kontainer:
  ```tsx
  <FadeIn delay={0.05} y={15}>
    <section className="shop-heading">
      <div className="shop-heading-main">
        <p className="eyebrow">01 / The first release</p>
        <h1>
          For the hours
          <br />
          around the game.
        </h1>
      </div>
      <div className="shop-heading-desc">
        <p>Original pieces in four quiet movements. Designed in small runs, worn long after the final whistle.</p>
      </div>
    </section>
  </FadeIn>
  ```

### B. Styling CSS Editorial ([`client/src/overrides.css`](file:///d:/Portofolio/Website/Pobo/client/src/overrides.css))
- Mengatur grid dua kolom dengan proporsi `1.15fr : 0.85fr`, perataan bawah (`align-items: end`), tipografi Newsreader berukuran besar, dan margin yang proporsional.
- Mendukung tampilan mobile responsif (`max-width: 760px`).

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/009_shop_heading_editorial_two_column_layout.md`
2. **[MODIFY]** `client/src/pages/Shop.tsx`
3. **[MODIFY]** `client/src/overrides.css`
4. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `16 file uji, 41 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/shop`)**: Berjalan lancar dan menyajikan tampilan sesuai screenshot.
