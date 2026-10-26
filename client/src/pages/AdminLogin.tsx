import { FadeIn, PageEntrance } from "@/components/MotionReveal";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, KeyRound, LoaderCircle, Lock, User, UserCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AdminLogin() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  const admin = authQuery.data?.role === "admin" ? authQuery.data : null;

  if (admin) {
    return (
      <PageEntrance>
        <main className="admin-login-page">
          <div className="admin-login-card">
            <div className="login-badge-wrap">
              <UserCheck size={32} className="login-badge-icon success" />
            </div>
            <p className="eyebrow">Authenticated Admin</p>
            <h1>Logged in as {admin.name || admin.email || "Admin"}</h1>
            <p className="login-desc">
              Anda memiliki hak akses administratif penuh untuk pengelolaan pesanan & katalog toko CFJ (cfjersey).
            </p>
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

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    loginMutation.mutate({ username: username.trim(), password });
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
            Masuk untuk memproses pesanan masuk, memantau pembayaran otomatis (Wise, Crypto), dan memperbarui
            katalog koleksi.
          </p>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username / Email Admin
              <div className="login-field">
                <input
                  type="text"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  required
                  autoComplete="username"
                />
                <User size={16} className="login-field-icon" />
              </div>
            </label>

            <label>
              Password
              <div className="login-field has-toggle">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Lock size={16} className="login-field-icon" />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(value => !value)}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className={`primary-button full-width login-submit ${loginMutation.isPending ? "is-loading" : ""}`}
              disabled={loginMutation.isPending}
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
