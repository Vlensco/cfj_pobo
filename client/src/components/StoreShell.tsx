import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/money";
import { saveCustomerOrder } from "@/lib/orderStorage";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardPenLine,
  Coins,
  CreditCard,
  LoaderCircle,
  LogOut,
  Menu,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { ScrollProgressBar } from "./MotionReveal";
import { CountryCurrencySelector } from "./CountryCurrencySelector";

type DrawerStage = "bag" | "auth" | "request" | "sent";

export function CustomerAuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const utils = trpc.useUtils();

  const loginCustomerMutation = trpc.auth.loginCustomer.useMutation({
    onSuccess: async data => {
      await utils.auth.me.invalidate();
      toast.success(`Welcome back, ${data.user.name || "Customer"}`);
      onClose();
    },
    onError: err => toast.error(err.message || "Failed to sign in"),
  });

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    if (tab === "register" && !name) {
      toast.error("Please enter your full name");
      return;
    }

    loginCustomerMutation.mutate({
      name: name || email.split("@")[0],
      email,
      phone: phone || undefined,
      loginMethod: tab === "register" ? "customer_registration" : "customer_login",
    });
  };

  const handleGoogleLogin = () => {
    loginCustomerMutation.mutate({
      name: "Google Customer",
      email: "client@example.com",
      phone: "+6281234567890",
      loginMethod: "google_oauth",
    });
  };

  return (
    <div className="customer-modal-scrim" onClick={onClose}>
      <div className="customer-modal-content" onClick={e => e.stopPropagation()}>
        <div className="customer-modal-head">
          <div>
            <img src="/cfj-logo.png" alt="CFJ" style={{ height: "26px", objectFit: "contain", marginBottom: "6px", display: "block" }} />
            <h3>{tab === "login" ? "Customer Sign-In" : "Create Account"}</h3>
          </div>
          <button className="customer-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${tab === "login" ? "active" : ""}`}
            onClick={() => setTab("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => setTab("register")}
          >
            Create Account
          </button>
        </div>

        <form className="auth-modal-body" onSubmit={handleSubmit}>
          {tab === "register" && (
            <div className="auth-input-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dimas Wardhana"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-input-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label>
              WhatsApp / Phone Number <span style={{ color: "#777", fontWeight: "normal" }}>({tab === "register" ? "recommended" : "optional"})</span>
            </label>
            <input
              type="tel"
              placeholder="+62 812 3456 7890"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          {tab === "register" && (
            <div className="auth-benefits-list">
              <div className="auth-benefits-item">
                <CheckCircle2 size={13} color="#2d643d" />
                <span>Live courier parcel tracking with 1-click updates</span>
              </div>
              <div className="auth-benefits-item">
                <CheckCircle2 size={13} color="#2d643d" />
                <span>Auto-fill shipping details for fast future checkout</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`primary-button full-width ${loginCustomerMutation.isPending ? "is-loading" : ""}`}
            disabled={loginCustomerMutation.isPending}
            style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "4px" }}
          >
            {loginCustomerMutation.isPending
              ? "Connecting..."
              : tab === "login"
              ? "Sign In to Account"
              : "Create Account & Sign In"}
          </button>

          <div className="auth-divider-line">
            <span>or continue with</span>
          </div>

          <div className="auth-quick-actions">
            <button
              type="button"
              className="google-auth-btn"
              onClick={handleGoogleLogin}
              disabled={loginCustomerMutation.isPending}
            >
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google One-Tap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [stage, setStage] = useState<DrawerStage>("bag");
  const [reference, setReference] = useState("");
  const authQuery = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const [checkoutAuthTab, setCheckoutAuthTab] = useState<"register" | "login">("register");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paddleInstance, setPaddleInstance] = useState<Paddle | null>(null);

  // Sync logged in user details whenever available
  useEffect(() => {
    if (authQuery.data) {
      if (authQuery.data.name && !customerName) setCustomerName(authQuery.data.name);
      if (authQuery.data.email && !customerEmail) setCustomerEmail(authQuery.data.email);
    }
  }, [authQuery.data]);

  useEffect(() => {
    let active = true;
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "test_489c3b42add599ea153ba220b18";
    if (token && !paddleInstance) {
      initializePaddle({
        environment: (import.meta.env.VITE_PADDLE_ENV as "sandbox" | "production") || "sandbox",
        token,
        eventCallback: (data: any) => {
          if (data?.name === "checkout.completed") {
            clearCart();
            window.location.href = `/order-success?provider=paddle&p_txn_id=${data?.data?.transaction_id || ""}`;
          }
        },
      })
        .then(p => {
          if (active && p) setPaddleInstance(p);
        })
        .catch(err => {
          console.warn("[Paddle.js] Failed to initialize:", err);
        });
    }
    return () => {
      active = false;
    };
  }, [clearCart, paddleInstance]);

  const paddleCheckoutMutation = trpc.paddle.createTransaction.useMutation({
    onSuccess: data => {
      if (paddleInstance && data.transactionId) {
        paddleInstance.Checkout.open({
          transactionId: data.transactionId,
          settings: {
            displayMode: "overlay",
            theme: "light",
            successUrl: `${window.location.origin}/order-success?provider=paddle`,
          },
        });
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.success(`Paddle transaction created: ${data.transactionId}`);
      }
    },
    onError: error => {
      toast.error(error.message || "Failed to initiate Paddle payment");
    },
  });

  const cryptoCheckoutMutation = trpc.crypto.createInvoice.useMutation({
    onSuccess: data => {
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        toast.error("Failed to generate Crypto invoice URL");
      }
    },
    onError: error => {
      toast.error(error.message || "Failed to initiate Crypto payment");
    },
  });

  const handlePayWithPaddle = () => {
    if (!items.length || paddleCheckoutMutation.isPending) return;
    paddleCheckoutMutation.mutate({
      items: items.map(i => ({
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        color: i.color,
        size: i.size,
      })),
      customerName: authQuery.data?.name || customerName || undefined,
      customerEmail: authQuery.data?.email || customerEmail || undefined,
    });
  };

  const handlePayWithCrypto = () => {
    if (!items.length || cryptoCheckoutMutation.isPending) return;
    const itemSummary = items.map(i => `${i.quantity}x ${i.product.name}`).join(", ");
    cryptoCheckoutMutation.mutate({
      amount: subtotal,
      orderDescription: itemSummary || "TERRACE Football Culture Apparel",
      customerEmail: authQuery.data?.email || customerEmail || undefined,
    });
  };

  const loginCustomerMutation = trpc.auth.loginCustomer.useMutation({
    onSuccess: async data => {
      await utils.auth.me.invalidate();
      setCustomerName(data.user.name || "");
      setCustomerEmail(data.user.email || "");
      if (data.user.phone) setCustomerPhone(data.user.phone);
      setStage("request");
      toast.success(`Welcome, ${data.user.name || "Customer"}`);
    },
    onError: err => toast.error(err.message || "Failed to sign in"),
  });

  const submitRequest = trpc.orderRequests.create.useMutation({
    onSuccess: data => {
      setReference(data.reference);
      saveCustomerOrder({
        reference: data.reference,
        customerName: customerName || undefined,
        email: customerEmail || undefined,
        subtotal: data.subtotal,
        currency: "IDR",
        status: "new",
        createdAt: new Date().toISOString(),
        paymentMethod: "order_request",
      });
      clearCart();
      setStage("sent");
      toast.success("Order request received.");
    },
    onError: error => toast.error(error.message || "Your order request could not be sent."),
  });

  const dismiss = () => {
    setStage("bag");
    setReference("");
    onClose();
  };

  const handleStartCheckout = () => {
    if (authQuery.data) {
      setCustomerName(authQuery.data.name || "");
      setCustomerEmail(authQuery.data.email || "");
      setStage("request");
    } else {
      setStage("auth");
    }
  };

  const handleQuickCustomerAuth = (e: FormEvent) => {
    e.preventDefault();
    if (!customerEmail) {
      toast.error("Please provide your email address");
      return;
    }
    const finalName = customerName || customerEmail.split("@")[0];
    loginCustomerMutation.mutate({
      name: finalName,
      email: customerEmail,
      phone: customerPhone || undefined,
      loginMethod: checkoutAuthTab === "register" ? "checkout_register" : "checkout_login",
    });
  };

  const handleGoogleCustomerLogin = () => {
    loginCustomerMutation.mutate({
      name: "Google Customer",
      email: "client@example.com",
      phone: "+6281234567890",
      loginMethod: "google_oauth",
    });
  };

  const sendRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length || submitRequest.isPending) return;
    const values = new FormData(event.currentTarget);
    const finalName = String(values.get("customerName") || customerName || "");
    const finalEmail = String(values.get("email") || customerEmail || "");
    const finalPhone = String(values.get("phone") || customerPhone || "");
    const finalNotes = String(values.get("notes") || customerNotes || "");

    submitRequest.mutate({
      customerName: finalName,
      email: finalEmail,
      phone: finalPhone,
      notes: finalNotes,
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
      })),
    });
  };

  const controlsDisabled = stage !== "bag" || submitRequest.isPending;

  return (
    <>
      <button
        aria-label="Close shopping bag overlay"
        className={`cart-scrim ${open ? "is-open" : ""}`}
        onClick={dismiss}
      />
      <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!open}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">
              {stage === "auth"
                ? "Customer Checkout Details"
                : stage === "request"
                ? "Order request"
                : stage === "sent"
                ? "Request received"
                : "Your bag"}
            </p>
            <h2>
              {stage === "auth"
                ? "Do you have an account?"
                : stage === "request"
                ? "Delivery & Contact"
                : stage === "sent"
                ? "Order Dispatched"
                : items.length
                ? `${items.length} ${items.length === 1 ? "piece" : "pieces"}`
                : "Your bag is empty"}
            </h2>
          </div>
          <button className="icon-button" onClick={dismiss} aria-label="Close shopping bag">
            <X size={20} />
          </button>
        </div>

        {stage === "sent" ? (
          <div className="request-confirmation">
            <CheckCircle2 size={34} strokeWidth={1.25} />
            <p className="eyebrow">Reference {reference}</p>
            <h3>Thanks for your request.</h3>
            <p>We will review the pieces and contact you to arrange payment and delivery.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "16px" }}>
              <Link href={`/orders?ref=${reference}`} className="primary-button" onClick={dismiss}>
                Track Order Status →
              </Link>
              <button className="secondary-button" onClick={dismiss}>
                Continue browsing
              </button>
            </div>
          </div>
        ) : stage === "auth" ? (
          <div className="request-form">
            <button className="request-back" type="button" onClick={() => setStage("bag")}>
              <ArrowLeft size={15} /> Back to bag
            </button>

            <div className="auth-tabs" style={{ borderRadius: "4px", overflow: "hidden", marginBottom: "8px" }}>
              <button
                type="button"
                className={`auth-tab-btn ${checkoutAuthTab === "register" ? "active" : ""}`}
                onClick={() => setCheckoutAuthTab("register")}
              >
                Belum Punya Akun (Register)
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${checkoutAuthTab === "login" ? "active" : ""}`}
                onClick={() => setCheckoutAuthTab("login")}
              >
                Sudah Punya Akun (Masuk)
              </button>
            </div>

            <p className="request-intro">
              {checkoutAuthTab === "register"
                ? "Daftar untuk simpan nomor HP, alamat, dan pantau status resi pengiriman otomatis."
                : "Masuk dengan email akun kamu agar data pemesanan langsung tersambung."}
            </p>

            <button
              type="button"
              className="google-login-btn"
              onClick={handleGoogleCustomerLogin}
              disabled={loginCustomerMutation.isPending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjut dengan Google</span>
            </button>

            <div className="login-divider">
              <span>atau isi data checkout</span>
            </div>

            <form onSubmit={handleQuickCustomerAuth} className="login-form">
              {checkoutAuthTab === "register" && (
                <label>
                  Nama Lengkap *
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas Wardhana"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </label>
              )}

              <label>
                Email Address *
                <input
                  type="email"
                  required
                  placeholder="dimas@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                />
              </label>

              <label>
                Nomor WhatsApp / HP *
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className={`primary-button full-width ${loginCustomerMutation.isPending ? "is-loading" : ""}`}
                disabled={loginCustomerMutation.isPending}
                style={{ marginTop: "6px" }}
              >
                {loginCustomerMutation.isPending
                  ? "Menghubungkan..."
                  : checkoutAuthTab === "register"
                  ? "Daftar & Lanjut Pemesanan"
                  : "Masuk & Lanjut Pemesanan"}
              </button>

              <button
                type="button"
                className="text-button"
                style={{ alignSelf: "center", marginTop: 8 }}
                onClick={() => setStage("request")}
              >
                Lanjut sebagai Tamu (Guest) →
              </button>
            </form>
          </div>
        ) : stage === "request" ? (
          <form className="request-form" onSubmit={sendRequest}>
            <button className="request-back" type="button" onClick={() => setStage("bag")}>
              <ArrowLeft size={15} /> Back to bag
            </button>
            <p className="request-intro">
              Pastikan data di bawah sudah benar. Tim Terrace akan menghubungi kamu untuk konfirmasi pengiriman & resi.
            </p>
            <label>
              Name
              <input
                name="customerName"
                autoComplete="name"
                required
                minLength={2}
                placeholder="Your name"
                value={customerName || authQuery.data?.name || ""}
                onChange={e => setCustomerName(e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={customerEmail || authQuery.data?.email || ""}
                onChange={e => setCustomerEmail(e.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                minLength={6}
                placeholder="081234567890"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </label>
            <label>
              Notes <span>optional</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="Delivery address, courier preference, or sizing note"
                value={customerNotes}
                onChange={e => setCustomerNotes(e.target.value)}
              />
            </label>
            <div className="request-total">
              <span>Requested total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <button
              className={`primary-button checkout-button ${submitRequest.isPending ? "is-loading" : ""}`}
              type="submit"
              disabled={submitRequest.isPending}
            >
              {submitRequest.isPending ? (
                <>
                  <LoaderCircle size={16} className="button-spinner" /> Sending request...
                </>
              ) : (
                <>
                  <ClipboardPenLine size={16} /> Send order request
                </>
              )}
            </button>
          </form>
        ) : (
          <>
            <div className="drawer-body">
              {!items.length ? (
                <div className="empty-bag">
                  <p>Your selections will stay here while you browse.</p>
                  <Link href="/shop" onClick={dismiss}>
                    Discover the drop
                  </Link>
                </div>
              ) : (
                items.map(item => (
                  <article className="cart-line" key={item.key}>
                    <img src={item.product.image} alt="" />
                    <div className="cart-line-info">
                      <div className="cart-line-top">
                        <div>
                          <p>{item.product.name}</p>
                          <span>
                            {item.color} · {item.size}
                          </span>
                        </div>
                        <button
                          disabled={controlsDisabled}
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.product.name}`}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="cart-line-bottom">
                        <div className="quantity-control">
                          <button
                            disabled={controlsDisabled}
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            disabled={controlsDisabled}
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
            {!!items.length && (
              <div className="drawer-foot">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <button
                    className={`primary-button checkout-button ${paddleCheckoutMutation.isPending ? "is-loading" : ""}`}
                    onClick={handlePayWithPaddle}
                    disabled={paddleCheckoutMutation.isPending}
                    style={{
                      backgroundColor: "var(--ink)",
                      color: "var(--paper)",
                      borderColor: "var(--ink)",
                      justifyContent: "center",
                    }}
                  >
                    {paddleCheckoutMutation.isPending ? (
                      <>
                        <LoaderCircle size={16} className="button-spinner" /> Loading Paddle Checkout...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} /> Pay with Card / Apple Pay · {formatPrice(subtotal)}
                      </>
                    )}
                  </button>

                  <button
                    className={`secondary-button ${cryptoCheckoutMutation.isPending ? "is-loading" : ""}`}
                    onClick={handlePayWithCrypto}
                    disabled={cryptoCheckoutMutation.isPending}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "linear-gradient(135deg, #1e293b, #0f172a)",
                      color: "#38bdf8",
                      border: "1px solid #334155",
                      borderRadius: "2px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {cryptoCheckoutMutation.isPending ? (
                      <>
                        <LoaderCircle size={16} className="button-spinner" /> Generating Crypto Invoice...
                      </>
                    ) : (
                      <>
                        <Coins size={16} /> Pay with Crypto (USDT / BTC)
                      </>
                    )}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={handleStartCheckout}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      cursor: "pointer",
                    }}
                  >
                    <ClipboardPenLine size={14} /> Request these pieces
                  </button>
                </div>

                <button className="text-button" onClick={clearCart} style={{ alignSelf: "center", marginTop: 4 }}>
                  Clear bag
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}

export function StoreShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [language, setLanguage] = useState("EN");
  const { itemCount } = useCart();

  const authQuery = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setDropdownOpen(false);
      toast.success("Signed out successfully");
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const isHomeActive = location === "/" || location === "";
  const isShopActive = location === "/shop" || location.startsWith("/products");
  const isCampaignActive = location === "/campaign";
  const isJournalActive = location === "/journal";
  const isTrackActive = location === "/track" || location === "/orders" || location === "/my-orders";

  const user = authQuery.data;

  return (
    <div className="store-shell">
      <ScrollProgressBar />
      <div className="announcement">
        <span>Complimentary shipping on orders over Rp2.5m</span>
        <span className="announcement-dot" />
        <span>Original design, small-batch production</span>
      </div>
      <header className="site-header">
        <button className="mobile-menu-button" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation">
          <Menu size={20} />
        </button>
        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <Link href="/" className={isHomeActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/shop" className={isShopActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link href="/campaign" className={isCampaignActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Campaign</Link>
          <Link href="/journal" className={isJournalActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Journal</Link>
          <Link href="/orders" className={isTrackActive ? "active" : ""} onClick={() => setMenuOpen(false)}>Orders</Link>
        </nav>
        <Link href="/" className="wordmark brand-logo-link" aria-label="CFJ home">
          <img src="/cfj-logo.png" alt="CFJ" className="brand-logo-img" />
        </Link>
        <div className="header-actions">
          {/* Country & Currency Selector matching screenshot */}
          <CountryCurrencySelector />

          <div className="language-selector" aria-label="Language selection">
            {["EN", "ID", "中文"].map(option => (
              <button key={option} onClick={() => setLanguage(option)} className={language === option ? "active" : ""}>
                {option}
              </button>
            ))}
          </div>

          {/* Customer Account Button / Dropdown */}
          <div className="account-wrapper">
            {user ? (
              <>
                <button
                  type="button"
                  className="account-btn is-logged-in"
                  onClick={() => setDropdownOpen(v => !v)}
                  aria-label="User Account Menu"
                >
                  <span className="account-avatar-dot">{(user.name || "U")[0]}</span>
                  <span>{user.name?.split(" ")[0] || "Account"}</span>
                  <ChevronDown size={12} />
                </button>
                {dropdownOpen && (
                  <div className="account-dropdown-menu">
                    <div className="dropdown-user-info">
                      <p className="dropdown-user-name">{user.name || "Customer"}</p>
                      <p className="dropdown-user-email">{user.email || ""}</p>
                      <span className="dropdown-user-badge">
                        {user.role === "admin" ? "Curator Admin" : "Verified Customer"}
                      </span>
                    </div>
                    <div className="dropdown-links">
                      <Link
                        href="/orders"
                        className="dropdown-link-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Package size={15} />
                        <span>My Orders & Tracking</span>
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin/orders"
                          className="dropdown-link-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <ClipboardPenLine size={15} />
                          <span>Admin Orders Console</span>
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
                      <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                className="account-btn"
                onClick={() => setAuthModalOpen(true)}
                aria-label="Sign In to Customer Account"
              >
                <User size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag with ${itemCount} items`}>
            <ShoppingBag size={18} />
            <span>Bag</span>
            <span className="bag-count" aria-hidden="true">{itemCount}</span>
          </button>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="footer-columns">
          <div className="footer-brand-col">
            <img src="/cfj-logo.png" alt="CFJ" className="footer-logo-img" />
            <p className="footer-tagline">Classic Football Jersey — old but gold. Original pieces in quiet movements. Designed by cfjersey in small runs.</p>
          </div>
          <div className="footer-nav-col">
            <p className="footer-heading">Navigation</p>
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/campaign">Campaign</Link>
            <Link href="/journal">Journal</Link>
            <Link href="/orders">Orders</Link>
            <Link href="/admin/login">Curator Portal</Link>
          </div>
          <div className="footer-inquiries-col">
            <p className="footer-heading">Inquiries</p>
            <a href="mailto:studio@cfjersey.com">studio@cfjersey.com</a>
            <p className="footer-note">Direct concierge for sizing and international delivery.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-legal">© 2026 CFJ (cfjersey). All rights reserved.</span>
          <span className="footer-city">Jakarta · London · Tokyo</span>
        </div>
      </footer>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CustomerAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
