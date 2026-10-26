import { LANGUAGES, useLanguage, useT } from "@/i18n";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ClipboardPenLine, LogOut, Menu, Package, ShoppingBag, User } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { CartDrawer } from "./CartDrawer";
import { CountryCurrencySelector } from "./CountryCurrencySelector";
import { CustomerAuthModal } from "./CustomerAuthModal";
import { ScrollProgressBar } from "./MotionReveal";

const ORDER_PATHS = ["/track", "/orders", "/my-orders"];

const NAV_LINKS: Array<{ href: string; label: string; isActive: (location: string) => boolean }> = [
  { href: "/", label: "Home", isActive: location => location === "/" || location === "" },
  { href: "/shop", label: "Shop", isActive: location => location === "/shop" || location.startsWith("/products") },
  { href: "/campaign", label: "Campaign", isActive: location => location === "/campaign" },
  { href: "/journal", label: "Journal", isActive: location => location === "/journal" },
  { href: "/orders", label: "Orders", isActive: location => ORDER_PATHS.includes(location) },
];

function AccountMenu({ onSignIn }: { onSignIn: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const user = trpc.auth.me.useQuery().data;

  const { resetBag } = useCart();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // A shared device should not hand the bag (names, numbers, font files) to the next person.
      resetBag();
      // Clears every cached query, so the next account never sees the previous one's orders.
      await utils.invalidate();
      setOpen(false);
      toast.success(t("Signed out successfully"));
    },
    onError: () => toast.error(t("Failed to sign out")),
  });

  if (!user) {
    return (
      <div className="account-wrapper">
        <button type="button" className="account-btn" onClick={onSignIn} aria-label={t("Sign In to Customer Account")}>
          <User size={14} />
          <span>{t("Sign In")}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="account-wrapper">
      <button
        type="button"
        className="account-btn is-logged-in"
        onClick={() => setOpen(value => !value)}
        aria-label={t("User Account Menu")}
      >
        <span className="account-avatar-dot">{(user.name || "U")[0]}</span>
        <span>{user.name?.split(" ")[0] || "Account"}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="account-dropdown-menu">
          <div className="dropdown-user-info">
            <p className="dropdown-user-name">{user.name || "Customer"}</p>
            <p className="dropdown-user-email">{user.email || ""}</p>
            <span className="dropdown-user-badge">{t(user.role === "admin" ? "Curator Admin" : "Customer")}</span>
          </div>
          <div className="dropdown-links">
            <Link href="/orders" className="dropdown-link-item" onClick={() => setOpen(false)}>
              <Package size={15} />
              <span>{t("My Orders & Tracking")}</span>
            </Link>
            {user.role === "admin" && (
              <Link href="/admin/orders" className="dropdown-link-item" onClick={() => setOpen(false)}>
                <ClipboardPenLine size={15} />
                <span>{t("Admin Orders Console")}</span>
              </Link>
            )}
          </div>
          <button
            type="button"
            className="dropdown-logout-btn"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut size={14} />
            <span>{t(logoutMutation.isPending ? "Signing out..." : "Sign Out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <div className="footer-brand-col">
          <img src="/cfj-logo.png" alt="CFJ" className="footer-logo-img" />
          <p className="footer-tagline">
            {t("Classic Football Jersey — old but gold. Original pieces in quiet movements. Designed by cfjersey in small runs.")}
          </p>
        </div>
        <div className="footer-nav-col">
          <p className="footer-heading">{t("Navigation")}</p>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}>
              {t(link.label)}
            </Link>
          ))}
          <Link href="/admin/login">{t("Curator Portal")}</Link>
        </div>
        <div className="footer-inquiries-col">
          <p className="footer-heading">{t("Inquiries")}</p>
          <a href="mailto:studio@cfjersey.com">studio@cfjersey.com</a>
          <p className="footer-note">{t("Direct concierge for sizing and international delivery.")}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-legal">{t("© 2026 CFJ (cfjersey). All rights reserved.")}</span>
        <span className="footer-city">{t("Jakarta · London · Tokyo")}</span>
      </div>
    </footer>
  );
}

export function StoreShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { itemCount } = useCart();

  return (
    <div className="store-shell">
      <ScrollProgressBar />
      <div className="announcement">
        <span>{t("Complimentary shipping on orders over Rp2.5m")}</span>
        <span className="announcement-dot" />
        <span>{t("Original design, small-batch production")}</span>
      </div>
      <header className="site-header">
        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(value => !value)}
          aria-label={t("Toggle navigation")}
        >
          <Menu size={20} />
        </button>
        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label={t("Main navigation")}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={link.isActive(location) ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
        <Link href="/" className="wordmark brand-logo-link" aria-label={t("CFJ home")}>
          <img src="/cfj-logo.png" alt="CFJ" className="brand-logo-img" />
        </Link>
        <div className="header-actions">
          <CountryCurrencySelector />

          <div className="language-selector" aria-label={t("Language selection")}>
            {LANGUAGES.map(option => (
              <button
                key={option.code}
                onClick={() => setLanguage(option.code)}
                className={language === option.code ? "active" : ""}
                aria-pressed={language === option.code}
              >
                {option.label}
              </button>
            ))}
          </div>

          <AccountMenu onSignIn={() => setAuthModalOpen(true)} />

          <button
            className="bag-button"
            onClick={() => setCartOpen(true)}
            aria-label={t("Shopping bag with {count} items", { count: itemCount })}
          >
            <ShoppingBag size={18} />
            <span>{t("Bag")}</span>
            <span className="bag-count" aria-hidden="true">
              {itemCount}
            </span>
          </button>
        </div>
      </header>
      {children}
      <SiteFooter />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CustomerAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
