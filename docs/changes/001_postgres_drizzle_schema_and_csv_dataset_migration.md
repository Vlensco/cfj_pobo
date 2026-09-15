# Catatan Perubahan #001: Migrasi PostgreSQL, Overhaul Drizzle Schema & Import Dataset CSV

**Tanggal:** 31 Agustus 2026  
**Status:** Selesai / Terverifikasi  
**Tujuan:**
1. Mengonfigurasi environment database PostgreSQL (`.env`).
2. Merombak skema Drizzle ORM dari MySQL ke PostgreSQL agar sepenuhnya memetakan dataset nyata dari CSV (`customers_export.csv`, `orders_export_1.csv`, `products_export_1.csv`) serta mempertahankan tabel auth dan order-request PRD.
3. Membuat script import data otomatis untuk membaca file CSV ke tabel database PostgreSQL `cfjersey`.
4. Mengupdate database access layer pada `server/db.ts` menggunakan driver PostgreSQL.

---

## 1. Breakdown Perubahan

### A. Environment Configuration (`.env`)
- Menambahkan konfigurasi database PostgreSQL lokal dengan user `theovine`, password `theovine`, dan database `cfjersey`:
  ```env
  DATABASE_URL=postgresql://theovine:theovine@localhost:5432/cfjersey
  JWT_SECRET=terrace_jwt_secret_dev_key_2026
  PORT=3000
  NODE_ENV=development
  ```

### B. Dependensi & Script (`package.json`)
- **Dependensi Ditambahkan:**
  - `postgres` (^3.4.5) & `pg` (^8.13.3): Driver PostgreSQL untuk Node.js.
  - `@types/pg` (^8.11.11): Definisi TypeScript untuk PostgreSQL client.
  - `papaparse` (^5.5.2) & `@types/papaparse` (^5.3.15): Parser CSV handal untuk mengolah data multi-line string, quote escaping, dan format angka.
- **Script Ditambahkan / Disesuaikan:**
  - `"db:push"`: `drizzle-kit push` (sinkronisasi skema langsung ke PostgreSQL).
  - `"db:generate"`: `drizzle-kit generate`.
  - `"db:migrate"`: `drizzle-kit migrate`.
  - `"db:import"`: `tsx server/scripts/import-csv.ts` (menjalankan script import dataset CSV).
  - `"dev"`: `tsx watch server/_core/index.ts` (cross-platform compatible).

### C. Drizzle Config (`drizzle.config.ts`)
- Mengubah dialect dari `"mysql"` ke `"postgresql"`.

### D. Skema Database Baru (`drizzle/schema.ts` & `drizzle/relations.ts`)
Menggunakan `drizzle-orm/pg-core` untuk mendefinisikan tabel-tabel berikut:

| Nama Tabel | Sumber Data / Tujuan | Keterangan Kolom Utama |
|---|---|---|
| `users` | Sistem Auth & Role PRD | `id`, `open_id` (unique), `name`, `email`, `role` (user/admin), timestamps |
| `customers` | `Database/customers_export.csv` | `id` (Customer ID), `first_name`, `last_name`, `email`, `phone`, `default_address_*`, `total_spent`, `total_orders`, `tags`, `note`, marketing consent fields |
| `products` | `Database/products_export_1.csv` | `handle` (PK), `title`, `body_html`, `vendor`, `product_category`, `type`, `tags`, `status`, `published`, `seo_title`, `seo_description` |
| `product_variants` | `Database/products_export_1.csv` | `id` (serial PK), `product_handle` (FK), `sku`, `option1/2/3_value`, `price`, `compare_at_price`, `grams`, `inventory_qty`, `barcode`, `image_src` |
| `product_images` | `Database/products_export_1.csv` | `id` (serial PK), `product_handle` (FK), `src`, `position`, `alt_text` |
| `orders` | `Database/orders_export_1.csv` | `name` (PK, e.g. `#CFJ2471`), `email`, `financial_status`, `fulfillment_status`, `currency`, `subtotal`, `shipping`, `taxes`, `total`, `discount_*`, `billing_*`, `shipping_*`, `notes`, `payment_*`, `tags`, `created_at` |
| `order_line_items` | `Database/orders_export_1.csv` | `id` (serial PK), `order_name` (FK), `lineitem_name`, `lineitem_quantity`, `lineitem_price`, `lineitem_compare_at_price`, `lineitem_sku`, `lineitem_fulfillment_status`, `lineitem_discount` |
| `order_requests` | Storefront Order Request Flow (PRD) | `id`, `reference` (unique), `customer_name`, `email`, `phone`, `notes`, `items` (JSON), `subtotal`, `currency` (IDR), `status` (new/contacted/closed), timestamps |
| `follow_up_reminder_settings` | Daily Reminder Scheduler PRD | `id`, `schedule_cron_task_uid`, `enabled`, `last_run_at`, timestamps |
| `follow_up_reminder_deliveries` | Durable Claim Tracker PRD | `id`, `order_request_id`, `reminder_date`, `claim_token`, `status` (claimed/delivered), timestamps |

### E. Script Import CSV (`server/scripts/import-csv.ts`)
- Menerapkan parsing batch chunking (250 baris per batch).
- Menangani pembersihan quote leading pada ID pelanggan dan nomor telepon.
- Mendukung deduplikasi gambar dan varian produk berdasarkan handle.
- Menghubungkan pesanan dan multi-line item secara presisi.

### F. Data Access Layer (`server/db.ts`)
- Menggantikan koneksi pool MySQL2 dengan Node Postgres `pg.Pool` dan Drizzle Postgres adapter.
- Mengadaptasi sintaks SQL:
  - `.onConflictDoUpdate()` dan `.onConflictDoNothing()` menggantikan MySQL `onDuplicateKeyUpdate`.
  - Format tanggal menggunakan `TO_CHAR(created_at, 'YYYY-MM-DD')` menggantikan `DATE_FORMAT`.
  - Operator query string menggunakan `ilike` untuk case-insensitive search PostgreSQL.
- Menambahkan query helper baru untuk katalog produk (`listDbProducts`, `getDbProductWithDetails`), pelanggan (`listDbCustomers`), dan riwayat pesanan (`listDbOrders`, `getDbOrderWithItems`).

---

## 2. File yang Dibuat / Dimodifikasi

1. **[NEW]** `.env`
2. **[NEW]** `docs/changes/CHANGELOG.md`
3. **[NEW]** `docs/changes/001_postgres_drizzle_schema_and_csv_dataset_migration.md`
4. **[NEW]** `server/scripts/import-csv.ts`
5. **[MODIFY]** `package.json`
6. **[MODIFY]** `drizzle.config.ts`
7. **[MODIFY]** `drizzle/schema.ts`
8. **[MODIFY]** `drizzle/relations.ts`
9. **[MODIFY]** `server/db.ts`

---

## 3. Hasil Pengujian & Verifikasi
- Dilakukan verifikasi koneksi PostgreSQL pada port 5432.
- Skema dieksekusi dengan Drizzle Kit.
- Data CSV di-import ke PostgreSQL.
- Typecheck TypeScript (`npm run check`) dan Vitest unit tests (`npm run test`) dijalankan dan tervalidasi.
