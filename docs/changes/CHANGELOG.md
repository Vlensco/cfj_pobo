# Changelog Perubahan Proyek TERRACE

Dokumen ini mencatat seluruh riwayat perubahan arsitektur, database, backend, dan fitur pada proyek TERRACE.

| ID Perubahan | Tanggal | Judul Perubahan | Dokumen Detail |
|---|---|---|---|
| `001` | 2026-08-31 | Migrasi Database ke PostgreSQL, Overhaul Drizzle Schema & Import CSV Dataset | [`001_postgres_drizzle_schema_and_csv_dataset_migration.md`](./001_postgres_drizzle_schema_and_csv_dataset_migration.md) |
| `002` | 2026-08-31 | Perbaikan Path Resolver Vite, Zod Schema Refinement & Verifikasi Server | [`002_fix_vite_path_resolution_and_zod_schema.md`](./002_fix_vite_path_resolution_and_zod_schema.md) |
| `003` | 2026-08-31 | Perbaikan Storage Proxy 500 Error & Penambahan Animasi Scroll / Reload | [`003_storage_proxy_fix_and_scroll_animations.md`](./003_storage_proxy_fix_and_scroll_animations.md) |
| `004` | 2026-08-31 | Integrasi Aset Foto Asli dari terrace-assets & Penyelesaian Vitest Types | [`004_integrate_terrace_assets_and_vitest_types.md`](./004_integrate_terrace_assets_and_vitest_types.md) |
| `005` | 2026-08-31 | Auto Scroll-to-Top Saat Navigasi & Membuka Produk | [`005_auto_scroll_to_top_on_navigation.md`](./005_auto_scroll_to_top_on_navigation.md) |
| `006` | 2026-08-31 | Peningkatan Navigasi Antar Halaman & Tombol Kembali ke Homepage | [`006_navbar_cross_page_navigation_enhancement.md`](./006_navbar_cross_page_navigation_enhancement.md) |
| `007` | 2026-08-31 | Penambahan Garis Bawah Aktif pada Navigasi (Active State Underline) | [`007_navbar_active_underline_indicators.md`](./007_navbar_active_underline_indicators.md) |
| `008` | 2026-08-31 | Penambahan Menu Home dengan Active Underline & Perbaikan Konfigurasi IDE TypeScript | [`008_navbar_home_active_state_and_tsconfig_fix.md`](./008_navbar_home_active_state_and_tsconfig_fix.md) |
| `009` | 2026-08-31 | Penyesuaian Layout Dua Kolom Editorial Bagian Atas Halaman Shop | [`009_shop_heading_editorial_two_column_layout.md`](./009_shop_heading_editorial_two_column_layout.md) |
| `010` | 2026-08-31 | Halaman Campaign & Journal Editorial, Sistem Login Admin Google/Local, Manajemen Katalog Produk (CMS), dan Tracking Add-to-Bag | [`010_campaign_journal_admin_auth_cms_and_add_to_bag_tracking.md`](./010_campaign_journal_admin_auth_cms_and_add_to_bag_tracking.md) |
| `011` | 2026-08-31 | Penyelesaian Diagnostik IDE TypeScript & Konfigurasi Tipe Vitest | [`011_fix_ide_type_diagnostics_and_tsconfig_vitest.md`](./011_fix_ide_type_diagnostics_and_tsconfig_vitest.md) |
| `012` | 2026-08-31 | Alur Checkout Smart-Auth (Login/Register Saat Checkout) & Penjelasan Struktur Admin | [`012_checkout_smart_auth_and_admin_structure.md`](./012_checkout_smart_auth_and_admin_structure.md) |
| `013` | 2026-08-31 | Penyesuaian Grid & Layout Bagian "Other Pieces" (Related Products) Pada Halaman Produk | [`013_fix_product_page_other_pieces_grid_layout.md`](./013_fix_product_page_other_pieces_grid_layout.md) |
| `014` | 2026-08-31 | Perbaikan Kebijakan Cookie SameSite untuk Lingkungan Localhost HTTP & Navigasi Admin Direct Reload | [`014_fix_localhost_session_cookie_samesite_and_admin_redirect.md`](./014_fix_localhost_session_cookie_samesite_and_admin_redirect.md) |
| `015` | 2026-08-31 | Perbaikan Validasi Token JWT (Payload App ID) & Verifikasi Sesi Admin | [`015_fix_jwt_session_token_app_id_validation.md`](./015_fix_jwt_session_token_app_id_validation.md) |
| `016` | 2026-08-31 | Penerapan Sticky Fixed Header Navbar dengan Glassmorphism | [`016_sticky_fixed_navbar_header.md`](./016_sticky_fixed_navbar_header.md) |
| `017` | 2026-08-31 | Integrasi Dinamis Data Produk dari Database CMS ke Seluruh Halaman Toko | [`017_dynamic_cms_products_storefront_integration.md`](./017_dynamic_cms_products_storefront_integration.md) |
| `018` | 2026-08-31 | Penerapan Paginasi Bernomor & Pengaturan Jumlah Item (10 / 15 Per Halaman) Per Section | [`018_numbered_pagination_and_page_size_selector.md`](./018_numbered_pagination_and_page_size_selector.md) |
| `019` | 2026-08-31 | Perbaikan Thumbnail Foto Tabel Admin, Perapian Paginasi Estetik, dan Penataan Layout Footer | [`019_fix_admin_table_thumbnail_pagination_layout_and_footer.md`](./019_fix_admin_table_thumbnail_pagination_layout_and_footer.md) |

---
*Catatan: Setiap pembaruan atau penambahan fitur wajib menambahkan entri baru pada tabel di atas serta membuat file rincian perubahan pada folder `docs/changes/`.*
