import type { TranslationTable } from "../types";

/** Header, footer, account menu, sign-in modal, region picker, pagination, and the 404 page. */
export const shell: TranslationTable = {
  // Navigation & header
  Home: ["Beranda", "首页"],
  Shop: ["Toko", "商店"],
  Campaign: ["Kampanye", "企划"],
  Journal: ["Jurnal", "日志"],
  Orders: ["Pesanan", "订单"],
  "Complimentary shipping on orders over Rp2.5m": ["Gratis ongkir untuk pesanan di atas Rp2,5 juta", "订单满 Rp2.5m 免运费"],
  "Original design, small-batch production": ["Desain orisinal, produksi terbatas", "原创设计，小批量生产"],
  "Toggle navigation": ["Buka/tutup navigasi", "切换导航"],
  "Main navigation": ["Navigasi utama", "主导航"],
  "CFJ home": ["Beranda CFJ", "CFJ 首页"],
  "Language selection": ["Pilihan bahasa", "语言选择"],
  "Shopping bag with {count} items": ["Tas belanja berisi {count} barang", "购物袋中有 {count} 件商品"],
  Bag: ["Tas", "购物袋"],

  // Account menu
  "Sign In": ["Masuk", "登录"],
  "Sign In to Customer Account": ["Masuk ke akun pelanggan", "登录客户账户"],
  "User Account Menu": ["Menu akun", "账户菜单"],
  Customer: ["Pelanggan", "客户"],
  "Curator Admin": ["Admin Kurator", "管理员"],
  "My Orders & Tracking": ["Pesanan & Pelacakan Saya", "我的订单与物流"],
  "Admin Orders Console": ["Konsol Pesanan Admin", "订单管理后台"],
  "Signing out...": ["Sedang keluar...", "正在退出..."],
  "Sign Out": ["Keluar", "退出登录"],
  "Signed out successfully": ["Berhasil keluar", "已退出登录"],
  "Failed to sign out": ["Gagal keluar", "退出失败"],

  // Footer
  "Classic Football Jersey — old but gold. Original pieces in quiet movements. Designed by cfjersey in small runs.": [
    "Classic Football Jersey — lawas tapi berkelas. Koleksi orisinal yang hadir tanpa hiruk-pikuk, dirancang cfjersey dalam jumlah terbatas.",
    "Classic Football Jersey — 经典永不过时。原创单品，低调呈现，由 cfjersey 小批量设计制作。",
  ],
  Navigation: ["Navigasi", "导航"],
  "Curator Portal": ["Portal Kurator", "管理入口"],
  Inquiries: ["Pertanyaan", "咨询"],
  "Direct concierge for sizing and international delivery.": [
    "Layanan langsung untuk ukuran dan pengiriman internasional.",
    "尺码与国际配送专属客服。",
  ],
  "© 2026 CFJ (cfjersey). All rights reserved.": ["© 2026 CFJ (cfjersey). Hak cipta dilindungi.", "© 2026 CFJ (cfjersey)。保留所有权利。"],
  "Jakarta · London · Tokyo": ["Jakarta · London · Tokyo", "雅加达 · 伦敦 · 东京"],

  // Sign-in modal
  "Create Account": ["Buat Akun", "创建账户"],
  "Customer Sign-In": ["Masuk Pelanggan", "客户登录"],
  "Close modal": ["Tutup", "关闭"],
  "Full Name": ["Nama Lengkap", "全名"],
  "e.g. Dimas Wardhana": ["Contoh: Dimas Wardhana", "例如：Dimas Wardhana"],
  "Email Address": ["Alamat Email", "电子邮箱"],
  "WhatsApp / Phone Number": ["Nomor WhatsApp / HP", "WhatsApp / 电话号码"],
  "(recommended)": ["(disarankan)", "（推荐）"],
  "(optional)": ["(opsional)", "（选填）"],
  "Live courier parcel tracking with 1-click updates": [
    "Pelacakan paket kurir langsung dengan sekali klik",
    "一键查看快递实时物流",
  ],
  "Auto-fill shipping details for fast future checkout": [
    "Data pengiriman terisi otomatis untuk checkout berikutnya",
    "自动填写收货信息，下次结账更快",
  ],
  "Connecting...": ["Menghubungkan...", "连接中..."],
  "Create Account & Sign In": ["Buat Akun & Masuk", "创建账户并登录"],
  "Sign In to Account": ["Masuk ke Akun", "登录账户"],
  "Welcome back, {name}": ["Selamat datang kembali, {name}", "欢迎回来，{name}"],
  "Welcome, {name}": ["Selamat datang, {name}", "欢迎，{name}"],
  "Failed to sign in": ["Gagal masuk", "登录失败"],
  "Please enter your email address": ["Masukkan alamat email kamu", "请输入电子邮箱"],
  "Please enter your full name": ["Masukkan nama lengkap kamu", "请输入全名"],

  // Region & currency picker
  "Region & currency set to {country} ({currency})": [
    "Wilayah & mata uang diatur ke {country} ({currency})",
    "地区与货币已设为 {country}（{currency}）",
  ],
  "Current Region: {country} ({currency})": ["Wilayah saat ini: {country} ({currency})", "当前地区：{country}（{currency}）"],
  Search: ["Cari", "搜索"],
  "Clear search": ["Hapus pencarian", "清除搜索"],
  'No region found matching "{query}"': ['Tidak ada wilayah yang cocok dengan "{query}"', "未找到与“{query}”匹配的地区"],
  Indonesia: ["Indonesia", "印度尼西亚"],
  Singapore: ["Singapura", "新加坡"],
  Malaysia: ["Malaysia", "马来西亚"],
  "United States": ["Amerika Serikat", "美国"],
  "United Kingdom": ["Inggris Raya", "英国"],
  Germany: ["Jerman", "德国"],
  Spain: ["Spanyol", "西班牙"],
  France: ["Prancis", "法国"],
  Italy: ["Italia", "意大利"],
  Netherlands: ["Belanda", "荷兰"],
  Switzerland: ["Swiss", "瑞士"],
  Japan: ["Jepang", "日本"],
  "South Korea": ["Korea Selatan", "韩国"],
  "Hong Kong": ["Hong Kong", "香港"],
  Australia: ["Australia", "澳大利亚"],
  Canada: ["Kanada", "加拿大"],
  "United Arab Emirates": ["Uni Emirat Arab", "阿联酋"],
  "Saudi Arabia": ["Arab Saudi", "沙特阿拉伯"],

  // Pagination
  Pagination: ["Halaman", "分页"],
  Previous: ["Sebelumnya", "上一页"],
  Next: ["Berikutnya", "下一页"],
  "Page {number}": ["Halaman {number}", "第 {number} 页"],
  "Per page:": ["Per halaman:", "每页："],

  // 404
  "Page Not Found": ["Halaman Tidak Ditemukan", "页面未找到"],
  "Sorry, the page you are looking for doesn't exist.": ["Maaf, halaman yang kamu cari tidak ada.", "抱歉，您访问的页面不存在。"],
  "It may have been moved or deleted.": ["Mungkin sudah dipindahkan atau dihapus.", "它可能已被移动或删除。"],
  "Go Home": ["Ke Beranda", "返回首页"],
};
