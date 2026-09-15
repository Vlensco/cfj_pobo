# PRD — TERRACE
## Premium Football-Culture Apparel Storefront

**Dokumen:** Product Requirements Document dan AI Implementation Guardrails  
**Versi:** 1.0  
**Tanggal:** 31 Agustus 2026  
**Pemilik produk:** TERRACE  
**Status:** Baseline yang harus dijadikan sumber kebenaran untuk perubahan berikutnya

---

## 1. Cara Menggunakan Dokumen Ini

Dokumen ini bukan sekadar deskripsi ide. Dokumen ini adalah **batas kerja** untuk manusia maupun AI yang mengubah proyek TERRACE. Setiap prompt baru harus dibaca bersama dokumen ini sebelum implementasi dimulai.

> Jangan memperluas scope, mengganti arsitektur, mengubah positioning, atau menambahkan integrasi hanya karena fitur tersebut terlihat menarik. Jika permintaan baru bertentangan dengan dokumen ini, pertahankan dokumen ini sebagai default dan minta konfirmasi eksplisit sebelum mengubah keputusan produk.

Aturan prioritas ketika terjadi konflik adalah: **instruksi pengguna terbaru yang eksplisit**, lalu dokumen PRD ini, lalu konvensi teknis proyek. Instruksi pengguna tetap tidak boleh menabrak aturan keamanan, larangan data palsu, atau kebutuhan kredensial yang belum tersedia.

Sebelum menulis kode, AI wajib menjelaskan secara singkat: bagian scope yang disentuh, file atau modul yang kemungkinan berubah, risiko migrasi data, dan cara pengujian. AI tidak boleh mengklaim fitur selesai sebelum test, type-check, dan verifikasi visual yang relevan selesai.

---

## 2. Ringkasan Produk

TERRACE adalah storefront direct-to-consumer untuk apparel yang terinspirasi oleh **budaya football**, suasana tribun, perjalanan menuju pertandingan, dan identitas komunitas. TERRACE bukan toko merchandise klub, liga, sponsor, atau pemain.

Produk harus terasa seperti label apparel premium dengan pendekatan editorial: tenang, eksklusif, fungsional, dan berkarakter. Pengalaman pengguna berpusat pada penemuan koleksi, pemahaman detail produk, penyimpanan barang ke shopping bag, dan pengiriman **permintaan pesanan** yang dapat ditindaklanjuti oleh owner.

Pembayaran langsung bukan bagian dari alur aktif saat ini. Karena owner belum memiliki akun Stripe aktif dan belum menyediakan email API atau WhatsApp API, checkout aktif menggunakan order-request flow yang menyimpan permintaan ke database dan memberi notifikasi internal kepada owner melalui helper platform yang sudah tersedia.

---

## 3. Tujuan dan Ukuran Keberhasilan

Tujuan utama TERRACE adalah membuat pengunjung memahami karakter brand dalam beberapa detik, menemukan produk tanpa friksi, mengirimkan permintaan pesanan dengan data yang lengkap, dan membantu owner menindaklanjuti permintaan secara terstruktur.

Keberhasilan implementasi diukur dari kriteria berikut:

| Area | Kriteria keberhasilan |
|---|---|
| Brand | Tampilan tetap premium, editorial, original, dan tidak menyerupai storefront generik. |
| Discovery | Pengguna dapat mencari, memfilter, mengurutkan, dan membagikan hasil katalog melalui URL. |
| Commerce | Shopping bag tetap tersimpan selama sesi dan order request tervalidasi sebelum dikirim. |
| Admin | Owner dapat melihat, mencari, memfilter, mengekspor, dan mengubah status permintaan. |
| Follow-up | Permintaan `new` yang berusia lebih dari 24 jam mudah ditemukan dan dapat memicu pengingat owner harian. |
| Data | Semua angka produk, kuantitas, status, dan ranking berasal dari data nyata; tidak ada data simulasi yang disamarkan sebagai data pelanggan. |
| Quality | Perubahan memiliki test yang relevan, lolos type-check, dan diverifikasi pada ukuran desktop serta mobile bila menyentuh UI. |

---

## 4. Non-Goals dan Larangan Keras

Bagian ini bersifat mengikat kecuali pengguna mengubahnya secara eksplisit dalam prompt baru.

1. Jangan menambahkan logo, nama, badge, warna khas, jersey, slogan, atau identitas yang meniru klub, liga, sponsor, federasi, kompetisi, atau pemain nyata.
2. Jangan membuat atau menambahkan customer review, rating, testimonial, jumlah pembelian, social proof, atau komentar pelanggan palsu. Jangan membuat fixture, seed, mock, atau copy yang terlihat seperti data pengguna nyata untuk tujuan tersebut.
3. Jangan mengaktifkan kembali Stripe Checkout atau alur pembayaran langsung tanpa instruksi eksplisit dan kredensial yang benar-benar disediakan owner.
4. Jangan menambahkan pengiriman email pelanggan atau WhatsApp otomatis tanpa provider, kredensial, sender identity, destination number, dan persetujuan scope yang jelas. Statusnya saat ini tetap **deferred**.
5. Jangan mengganti order-request flow menjadi checkout berbayar hanya karena komponen pembayaran terlihat tersedia di template.
6. Jangan menghapus atau mengganti data database secara destruktif. Migrasi schema harus additive dan harus ditinjau sebelum diterapkan.
7. Jangan memakai `setInterval`, `node-cron`, atau timer proses untuk pekerjaan periodik. Pekerjaan terjadwal harus memakai platform Heartbeat setelah website dipublish.
8. Jangan membuat bypass authorization produksi. Mode preview development hanya untuk verifikasi visual dan tidak boleh digunakan sebagai akses admin nyata.
9. Jangan mengganti bahasa website menjadi satu bahasa saja. Pilihan bahasa **English, Indonesian, dan Mandarin** harus dipertahankan.
10. Jangan menambahkan library, backend, external API, atau halaman baru tanpa alasan yang berkaitan langsung dengan kebutuhan TERRACE.

---

## 5. Arah Brand dan Visual

TERRACE harus terasa seperti editorial fashion yang bertemu football culture, bukan dashboard template atau toko merchandise massal. Gunakan ruang kosong yang terukur, grid yang rapi, tipografi display serif yang kuat, utility text sans-serif yang ringkas, dan aksen warna lapangan yang digunakan secara hemat.

Palet dan komposisi harus mempertahankan hubungan visual antara **fog, paper, ink, pitch, dan aksen emas kusam**. Kontras teks kecil, focus state, tombol, link, dan status badge wajib tetap terbaca. Hindari gradient neon, glassmorphism, efek 3D berlebihan, rounded-card berlebihan, dan animasi yang mengalahkan konten.

Fotografi dan ilustrasi harus original atau memiliki hak penggunaan yang jelas. Aset tidak boleh memuat IP pihak ketiga yang dilarang pada bagian Non-Goals. Jika aset baru diperlukan, jelaskan sumber atau buat aset yang aman secara original; jangan mengarang asal-usul aset.

Animasi harus singkat, fungsional, dan menghormati `prefers-reduced-motion`. Animasi loading boleh menunjukkan bahwa aksi sedang diproses, tetapi tidak boleh memblokir pengguna tanpa alasan.

---

## 6. Pengalaman Publik Storefront

### 6.1 Navigasi dan bahasa

Storefront memiliki navigasi ke Shop, Campaign, dan Journal atau area editorial yang setara. Header harus responsif dan menyediakan shopping bag. Selector bahasa harus tetap menyediakan **EN, ID, dan 中文/Mandarin**. Perubahan bahasa tidak boleh merusak state shopping bag maupun parameter pencarian katalog.

### 6.2 Homepage

Homepage harus memperkenalkan dunia TERRACE melalui campaign storytelling, featured release, collection entry point, dan CTA menuju katalog. Hero harus mendukung headline singkat, imagery yang kuat, dan CTA yang jelas. Jangan mengisi homepage dengan klaim penjualan atau testimonial yang tidak bersumber dari data nyata.

### 6.3 Katalog

Katalog harus mendukung pencarian berdasarkan nama dan copy produk, filter kategori, filter harga, filter gabungan, pengurutan featured/newest/lowest price/highest price, serta empty state yang informatif. Query `search`, `category`, `minPrice`, `maxPrice`, dan `sort` harus dapat disimpan ke URL agar hasil dapat dibagikan dan dipulihkan melalui browser back/forward.

Filter dan sorting harus stabil, tidak menyebabkan request loop akibat object reference yang berubah-ubah, dan tetap dapat digunakan pada mobile. Jangan menghapus filter lama ketika menambahkan filter baru.

### 6.4 Product detail dan shopping bag

Halaman product detail menampilkan gallery multi-view, pilihan warna dan ukuran, harga IDR, detail bahan atau garment, dan fit guidance. Shopping bag harus menyimpan item dan kuantitas secara konsisten, menyediakan kontrol quantity, total, empty state, dan drawer yang aksesibel.

Saat item dimasukkan ke bag, tampilkan loading atau confirmation interaction yang elegan. Saat order request diproses, disable kontrol yang relevan, berikan feedback yang jelas, dan cegah submit ganda.

### 6.5 Order request

Order request mengumpulkan nama, email, nomor telepon, catatan opsional, ringkasan item, kuantitas, varian, subtotal, currency, dan reference number. Semua request baru masuk dengan status `new` dan menggunakan IDR.

Flow harus memiliki validasi field, error state, cancel/back action, confirmation state, dan empty-bag protection. Setelah request berhasil, owner dapat diberi notifikasi internal menggunakan helper yang sudah tersedia. Email konfirmasi kepada pelanggan dan WhatsApp automation tetap ditunda sampai kredensial tersedia.

---

## 7. Protected Admin `/admin/orders`

Halaman admin harus tetap dilindungi oleh autentikasi dan pemeriksaan role admin melalui procedure backend. Admin dapat melihat daftar order request, membuka detail customer dan requested pieces, serta mengubah status dari `new` menjadi `contacted` atau `closed` melalui aksi cepat.

Fitur yang harus dipertahankan:

| Fitur | Ketentuan |
|---|---|
| Search | Cari berdasarkan nama customer atau request reference. |
| Pagination | Gunakan pagination atau mekanisme load yang tidak membuat daftar sulit dipakai ketika data bertambah. |
| Date range | Sediakan tanggal awal/akhir dan preset Last 7 Days serta This Month. |
| Status summary | Tampilkan count dan requested value untuk New, Contacted, dan Closed serta perbandingan periode bila tersedia. |
| Trend | Grafik harian harus mengikuti scope tanggal dan search/filter yang aktif. Warning ukuran chart di happy-dom boleh muncul selama test tetap lulus dan production layout benar. |
| Product filter | Filter berdasarkan product type yang benar-benar terdapat pada item request. |
| Export | XLSX dan CSV harus mengekspor baris yang sesuai scope aktif, bukan data acak atau data di luar filter. |
| Quick actions | Aksi Contacted/Closed harus mengubah status server-side dan melakukan invalidasi query yang relevan. |
| Error state | Kegagalan loading harus dibedakan dari daftar kosong. |

### 7.1 Follow-up overdue

Permintaan dianggap **overdue/uncontacted** bila `status = new` dan `createdAt <= now - 24 jam`. Tombol atau filter **Needs follow-up** harus mengubah list menjadi hanya permintaan tersebut. Dashboard harus menampilkan counter backlog overdue secara jelas.

Kebijakan default: counter overdue bersifat global terhadap backlog yang memenuhi syarat, sedangkan product popularity mengikuti scope monitoring aktif yang dipilih admin. Jika kebijakan ini diubah, jelaskan dampaknya pada query, UI, dan test sebelum implementasi.

### 7.2 Popularity ranking

Panel **Top requested pieces** harus menghitung peringkat berdasarkan jumlah unit yang diminta dari JSON item request yang tersimpan. Ranking bukan ranking sales, revenue, conversion, atau completed orders kecuali field dan definisinya memang tersedia.

Parser harus aman terhadap JSON invalid, item tanpa product ID, quantity non-positif, atau field yang hilang. Jangan membuat angka pengganti. Jika tidak ada data valid, tampilkan empty state. Sertakan request count bila tersedia, tetapi jangan menyebutnya sebagai jumlah pembeli unik bila identitas unik belum dihitung secara benar.

### 7.3 Automatic owner reminder

Implementasi reminder menggunakan endpoint terautentikasi `/api/scheduled/follow-up-reminders` yang dipanggil oleh platform Heartbeat. Endpoint harus dipasang secara eksplisit sebelum static/Vite fallback dan hanya menerima caller cron yang lolos `sdk.authenticateRequest` serta cocok dengan task UID yang tersimpan.

Reminder berjalan harian pada konfigurasi awal pukul **09.00 WIB**, yang setara dengan `0 0 2 * * *` jika cron platform memakai enam field UTC. Jadwal tidak aktif di sandbox development; website harus dipublish terlebih dahulu.

Reminder memakai `notifyOwner`, bukan email atau WhatsApp eksternal. Proses harus aman terhadap retry. Klaim reminder disimpan durable per order dan per tanggal lokal Jakarta sebelum notifikasi dikirim. Jika pengiriman gagal, klaim tidak boleh ditandai delivered sehingga retry masih memungkinkan. Jika proses gagal setelah delivery berhasil, retry tidak boleh mengirim notifikasi kedua untuk order dan tanggal yang sama.

Pesan reminder harus ringkas, menyebut jumlah overdue request, menampilkan reference dan nama customer secukupnya, dan memberi arahan untuk membuka `/admin/orders` lalu memilih Needs follow-up. Jangan memasukkan data pembayaran sensitif.

---

## 8. Arsitektur Teknis Baseline

| Layer | Keputusan yang harus dipertahankan |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind 4, React Testing Library, Recharts bila diperlukan. |
| Backend | Express 4 dan tRPC 11. Gunakan procedure protected/admin untuk data admin. |
| Database | Drizzle ORM dengan MySQL/TiDB. Timestamp bisnis disimpan sebagai UTC; tampilkan dalam timezone lokal pengguna. |
| Auth | Manus OAuth dan role-based authorization. Jangan membuat session atau cookie custom tanpa alasan kuat. |
| Storage | S3 melalui helper yang telah disediakan jika ada file upload; jangan menyimpan bytes file di database. |
| Notification | `notifyOwner` untuk notifikasi owner internal. Provider eksternal tetap deferred. |
| Schedule | Platform Heartbeat dengan cron enam field UTC; bukan timer proses. |
| Currency | IDR untuk order-request flow aktif. |
| Testing | Vitest, Testing Library, happy-dom untuk UI interaction, dan `pnpm check`. |

Query database harus diletakkan pada data access layer yang sesuai, procedure harus memvalidasi input, dan UI harus menggunakan client tRPC yang sudah ada. Hindari menambahkan wrapper fetch atau Axios baru untuk endpoint internal yang sudah memiliki kontrak tRPC.

Setiap perubahan schema harus mengikuti urutan: ubah `drizzle/schema.ts`, jalankan generator migration, baca SQL hasilnya, tinjau apakah additive dan aman, lalu terapkan menggunakan jalur migrasi/database yang sesuai. Jangan menjalankan operasi DROP atau perubahan yang berpotensi kehilangan data tanpa persetujuan eksplisit.

---

## 9. Aturan Data dan Privasi

Data order request adalah data operasional nyata. Jangan mengubah nama, nomor telepon, email, reference, subtotal, item, atau status hanya untuk membuat screenshot tampak bagus. Preview development yang sudah ada hanya boleh digunakan untuk verifikasi layout dan harus diberi batas yang jelas agar tidak menjadi bypass produksi.

Data yang ditampilkan pada notifikasi owner harus secukupnya untuk follow-up. Jangan mengirimkan secret, token, data pembayaran, atau seluruh payload customer ke kanal yang tidak diperlukan. Jangan menaruh secret di source code, markdown publik, ZIP, fixture, test snapshot, atau log.

---

## 10. Protokol Perubahan untuk AI

Ketika menerima prompt baru, AI harus menjalankan urutan berikut:

1. Identifikasi apakah prompt berhubungan dengan storefront publik, admin, database, schedule, external integration, atau visual asset.
2. Cocokkan permintaan dengan scope dan larangan PRD ini.
3. Jika ambigu, tuliskan asumsi paling kecil dan tanyakan hanya hal yang benar-benar menghalangi implementasi.
4. Untuk request multi-langkah, pecah pekerjaan menjadi fase: definisi perilaku, implementasi, test, verifikasi visual, dan checkpoint.
5. Untuk request yang mengubah proyek, tambahkan item ke `todo.md` sebelum mengedit kode.
6. Evaluasi komponen/template yang sudah ada sebelum membuat komponen baru.
7. Pertahankan kompatibilitas dengan fitur yang sudah selesai. Jangan menghapus fitur lama hanya untuk menyederhanakan implementasi.
8. Jalankan test dan type-check. Jika menyentuh UI, verifikasi desktop dan mobile. Jika menyentuh schedule atau database, verifikasi handler, auth, idempotency, dan migration.
9. Tandai item `todo.md` selesai hanya setelah bukti verifikasi tersedia.
10. Buat checkpoint sebelum menyerahkan perubahan. Untuk publish, minta owner menekan Publish pada UI; jangan mengklaim deployment selesai jika belum dilakukan.

Jika prompt meminta sesuatu yang tidak ada dalam PRD, AI harus membedakan tiga kemungkinan: perubahan kecil yang kompatibel, perubahan scope yang membutuhkan konfirmasi, atau permintaan yang dilarang. Jangan mengubah keputusan produk secara diam-diam.

---

## 11. Format Prompt yang Direkomendasikan

Gunakan wrapper berikut ketika memberi tugas implementasi kepada AI:

```text
Gunakan PRD TERRACE sebagai sumber kebenaran.

TUJUAN:
[Jelaskan satu hasil yang ingin dicapai.]

SCOPE:
[File, halaman, atau fitur yang boleh disentuh.]

BATASAN:
- Jangan menghapus fitur yang sudah ada.
- Jangan membuat data customer, review, rating, atau testimonial palsu.
- Jangan menambah Stripe, email API, WhatsApp API, atau integrasi eksternal tanpa kredensial dan persetujuan eksplisit.
- Pertahankan EN, ID, dan Mandarin.
- Pertahankan keamanan admin dan aturan database pada PRD.

HASIL YANG DIMINTA:
[Jelaskan UI, backend, data, atau perilaku yang harus terlihat.]

VERIFIKASI:
[Jelaskan test, type-check, screenshot, atau skenario yang wajib dibuktikan.]

Sebelum coding, sebutkan asumsi, file yang akan diubah, risiko, dan rencana test.
```

---

## 12. Definition of Done

Sebuah perubahan dianggap selesai hanya jika perilakunya sesuai PRD, tidak menambah data palsu, tidak melemahkan authorization, tidak merusak bahasa atau fitur yang telah ada, dan memiliki test yang sesuai dengan risiko perubahan.

Untuk perubahan database, migration harus telah dibuat dan diterapkan dengan aman. Untuk perubahan scheduled job, endpoint harus terautentikasi, idempotent, mengembalikan JSON pada error maupun sukses, dan siap diaktifkan setelah publish. Untuk perubahan visual, desktop dan mobile harus diperiksa. Untuk semua perubahan, `todo.md` harus mencerminkan keadaan yang benar dan checkpoint harus disimpan sebelum deliverable diberikan.

---

## 13. Status Integrasi Saat Ini

| Integrasi | Status dan aturan |
|---|---|
| Stripe | Tidak digunakan pada runtime order-request aktif. Jangan mengaktifkan pembayaran langsung tanpa instruksi dan kredensial baru. |
| Email pelanggan | Deferred; belum ada provider API dan sender configuration. |
| WhatsApp admin | Deferred; belum ada WhatsApp API, sender identity, dan destination number. |
| Owner notification | Digunakan untuk notifikasi internal melalui `notifyOwner`. |
| Daily reminder | Endpoint sudah disiapkan; aktivasi schedule membutuhkan website yang sudah dipublish. |
| Shopify | Jangan menambahkan ke proyek ini karena integrasi Stripe sudah terkait pada project configuration; gunakan project copy terpisah bila keputusan produk berubah. |

---

## Referensi Internal

Dokumen ini disusun berdasarkan keputusan produk dan arsitektur yang telah ditetapkan untuk proyek TERRACE. Tidak ada data eksternal, testimonial, ranking penjualan, atau klaim pelanggan yang digunakan sebagai dasar dokumen ini.
