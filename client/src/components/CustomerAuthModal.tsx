import { useT } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type AuthTab = "login" | "register";

const REGISTER_BENEFITS = [
  "Live courier parcel tracking with 1-click updates",
  "Auto-fill shipping details for fast future checkout",
];

export function CustomerAuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<AuthTab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.loginCustomer.useMutation({
    onSuccess: async data => {
      // Refreshes every cached query, including the order history of the new account.
      await utils.invalidate();
      setPassword("");
      toast.success(t("Welcome back, {name}", { name: data.user.name || t("Customer") }));
      onClose();
    },
    onError: err => toast.error(err.message || t("Failed to sign in")),
  });

  if (!open) return null;

  const isRegister = tab === "register";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error(t("Please enter your email address"));
      return;
    }
    if (isRegister && !name) {
      toast.error(t("Please enter your full name"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("Password must be at least 8 characters"));
      return;
    }

    loginMutation.mutate({
      name: name || email.split("@")[0],
      email,
      phone: phone || undefined,
      password,
      loginMethod: isRegister ? "customer_registration" : "customer_login",
    });
  };

  const submitLabel = loginMutation.isPending
    ? "Connecting..."
    : isRegister
      ? "Create Account & Sign In"
      : "Sign In to Account";

  return (
    <div className="customer-modal-scrim" onClick={onClose}>
      <div className="customer-modal-content" onClick={event => event.stopPropagation()}>
        <div className="customer-modal-head">
          <div>
            <img src="/cfj-logo.png" alt="CFJ" className="customer-modal-logo" />
            <h3>{t(isRegister ? "Create Account" : "Customer Sign-In")}</h3>
          </div>
          <button className="customer-modal-close" onClick={onClose} aria-label={t("Close modal")}>
            <X size={18} />
          </button>
        </div>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab-btn ${isRegister ? "" : "active"}`} onClick={() => setTab("login")}>
            {t("Sign In")}
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => setTab("register")}
          >
            {t("Create Account")}
          </button>
        </div>

        <form className="auth-modal-body" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-input-group">
              <label>{t("Full Name")}</label>
              <input
                type="text"
                required
                placeholder={t("e.g. Dimas Wardhana")}
                value={name}
                onChange={event => setName(event.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-input-group">
            <label>{t("Email Address")}</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label>{t("Password")}</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder={t(isRegister ? "At least 8 characters" : "Your password")}
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>

          <div className="auth-input-group">
            <label>
              {t("WhatsApp / Phone Number")}{" "}
              <span className="auth-label-hint">{t(isRegister ? "(recommended)" : "(optional)")}</span>
            </label>
            <input
              type="tel"
              placeholder="+62 812 3456 7890"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </div>

          {isRegister && (
            <div className="auth-benefits-list">
              {REGISTER_BENEFITS.map(benefit => (
                <div className="auth-benefits-item" key={benefit}>
                  <CheckCircle2 size={13} color="#2d643d" />
                  <span>{t(benefit)}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className={`primary-button auth-submit-btn ${loginMutation.isPending ? "is-loading" : ""}`}
            disabled={loginMutation.isPending}
          >
            {t(submitLabel)}
          </button>
        </form>
      </div>
    </div>
  );
}
