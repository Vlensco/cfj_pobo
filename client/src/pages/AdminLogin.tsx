import { FadeIn, PageEntrance } from "@/components/MotionReveal";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.loginLocalAdmin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Login Berhasil! Selamat datang di Panel Admin CFJ.");
      window.location.href = "/admin/orders";
    },
    onError: err => {
      toast.error(err.message || "Login gagal. Periksa username dan password.");
    },
  });

  // If already logged in, show redirect prompt
  if (authQuery.data && authQuery.data.role === "admin") {
    return (
      <PageEntrance>
        <main className="admin-login-page">
          <div className="admin-login-card">
            <div className="login-badge-wrap">
              <UserCheck size={32} className="login-badge-icon success" />
            </div>
            <p className="eyebrow">Authenticated Admin</p>
            <h1>Logged in as {authQuery.data.name || authQuery.data.email || "Admin"}</h1>
            <p className="login-desc">Anda memiliki hak akses administratif penuh untuk pengelolaan pesanan & katalog toko CFJ (cfjersey).</p>
            <div className="login-actions">
              <Link href="/admin/orders" className="primary-button full-width">
                Kelola Pesanan (Order Dashboard) <ArrowUpRight size={16} />
              </Link>
              <Link href="/admin/catalog" className="secondary-button full-width">
                Kelola Katalog Pakaian
              </Link>
              <Link href="/" className="text-link center-link">
                Kembali ke Toko
              </Link>
            </div>
          </div>
        </main>
      </PageEntrance>
    );
  }

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      username: username.trim(),
      password: password.trim(),
      email: username.includes("@") ? username.trim() : "admin@cfjersey.com",
      name: "CFJ Administrator",
    });
  };

  const fillDefaultCredentials = () => {
    setUsername("admin");
    setPassword("admin123");
    toast.info("Kredensial admin diisi otomatis (admin / admin123)");
  };

  return (
    <PageEntrance>
      <main className="admin-login-page">
        <Link href="/" className="login-back-store">
          <ArrowLeft size={15} /> Storefront
        </Link>

        <FadeIn className="admin-login-card" delay={0.1}>
          <div className="login-badge-wrap">
            <Lock size={28} className="login-badge-icon" />
          </div>

          <p className="eyebrow">CFJ Staff Access</p>
          <h1>Admin Portal Login</h1>
          <p className="login-desc">
            Masuk untuk memproses pesanan masuk, memantau pembayaran otomatis (Stripe, Paddle, Crypto), dan memperbarui katalog koleksi.
          </p>

          {/* Credentials Helper Badge */}
          <div
            style={{
              backgroundColor: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "12px 14px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} style={{ color: "var(--primary)" }} />
              <div style={{ fontSize: "0.8rem", textAlign: "left" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Akun Default: </span>
                <strong style={{ fontFamily: "monospace", color: "var(--foreground)" }}>admin</strong>
                <span style={{ color: "var(--muted-foreground)" }}> / </span>
                <strong style={{ fontFamily: "monospace", color: "var(--foreground)" }}>admin123</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDefaultCredentials}
              style={{
                fontSize: "0.75rem",
                padding: "4px 8px",
                borderRadius: "2px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Isi Cepat
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username / Email Admin
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  autoComplete="username"
                  style={{ width: "100%", paddingLeft: "36px" }}
                />
                <User
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: "var(--muted-foreground)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </label>

            <label>
              Password
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="admin123"
                  autoComplete="current-password"
                  style={{ width: "100%", paddingLeft: "36px", paddingRight: "36px" }}
                />
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: "var(--muted-foreground)",
                    pointerEvents: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    padding: "4px",
                  }}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className={`primary-button full-width ${loginMutation.isPending ? "is-loading" : ""}`}
              disabled={loginMutation.isPending}
              style={{ marginTop: "12px" }}
            >
              {loginMutation.isPending ? (
                <>
                  <LoaderCircle size={16} className="button-spinner" /> Memverifikasi...
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Masuk ke Panel Admin
                </>
              )}
            </button>
          </form>

          <p className="login-footer-disclaimer">
            Area khusus kurator & staf CFJ (cfjersey). Sesi terenkripsi menggunakan token HTTPOnly cookie yang aman.
          </p>
        </FadeIn>
      </main>
    </PageEntrance>
  );
}
