# Catatan Perubahan #014: Perbaikan Kebijakan Cookie SameSite untuk Lingkungan Localhost HTTP & Navigasi Admin Direct Reload

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Memperbaiki kendala login admin di browser Chrome/Edge yang menolak penyimpanan cookie sesi pada lingkungan HTTP localhost.
2. Menyesuaikan konfigurasi `sameSite: secure ? "none" : "lax"` pada cookie Express.
3. Menyempurnakan navigasi halaman login admin agar melakukan sinkronisasi sesi secara langsung (`window.location.href = "/admin/orders"`).

---

## 1. Breakdown Perubahan

### A. Kebijakan Cookie Sesi ([`server/_core/cookies.ts`](file:///d:/Portofolio/Website/Pobo/server/_core/cookies.ts))
- Chrome dan browser modern mewajibkan flag `SameSite=Lax` ketika berjalan di atas protokol non-HTTPS (`http://localhost:3000`). Sebelumnya `SameSite=None` tanpa `Secure` ditolak oleh browser.
- Diperbaiki menjadi:
  ```ts
  export function getSessionCookieOptions(req: Request) {
    const secure = isSecureRequest(req);
    return {
      httpOnly: true,
      path: "/",
      sameSite: secure ? "none" : "lax",
      secure,
    };
  }
  ```

### B. Handler Login & Sinkronisasi Client ([`client/src/pages/AdminLogin.tsx`](file:///d:/Portofolio/Website/Pobo/client/src/pages/AdminLogin.tsx))
- Setelah mutasi login berhasil (`loginLocalAdmin`), browser langsung dialihkan ke `/admin/orders` via hard navigation sehingga seluruh state sesi, hak akses, dan query dashboard ter-mount secara sempurna.

---

## 2. File yang Dimodifikasi

1. **[NEW]** `docs/changes/014_fix_localhost_session_cookie_samesite_and_admin_redirect.md`
2. **[MODIFY]** `server/_core/cookies.ts`
3. **[MODIFY]** `client/src/pages/AdminLogin.tsx`
4. **[MODIFY]** `docs/changes/CHANGELOG.md`

---

## 3. Hasil Pengujian & Verifikasi
- **TypeScript Check (`npm run check`)**: `0 error` (Lolos).
- **Vitest Unit Tests (`npm run test`)**: `17 file uji, 44 tes` (100% Lolos).
- **Build Production (`npm run build`)**: Sukses dibuat di `dist/`.
- **Server Runtime (`http://localhost:3000/`)**: Berjalan aktif dan cookie sesi tersimpan otomatis di browser.
