import { useT } from "@/i18n";
import { CartItem, useCart } from "@/contexts/CartContext";
import { formatInRegion, useFormatPrice, useRegion } from "@/lib/currency";
import { toOrderItems } from "@/lib/orderItems";
import { saveCustomerOrder } from "@/lib/orderStorage";
import { trpc } from "@/lib/trpc";
import { DEFAULT_REGION } from "@shared/regions";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPenLine,
  Coins,
  Landmark,
  LoaderCircle,
  LogIn,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type DrawerStage = "bag" | "auth" | "request" | "sent";
type CheckoutAuthTab = "register" | "login";

const STAGE_HEADINGS: Record<Exclude<DrawerStage, "bag">, { eyebrow: string; title: string }> = {
  auth: { eyebrow: "Customer Checkout Details", title: "Do you have an account?" },
  request: { eyebrow: "Order request", title: "Delivery & Contact" },
  sent: { eyebrow: "Request received", title: "Order Dispatched" },
};

function CartLine({ item, disabled, problem }: { item: CartItem; disabled: boolean; problem?: string | null }) {
  const t = useT();
  const formatPrice = useFormatPrice();
  const { updateQuantity, removeItem } = useCart();
  const { nameset, patch, itemNote } = item.customization ?? {};

  return (
    <article className={`cart-line ${problem ? "has-problem" : ""}`}>
      <img src={item.product.image} alt="" />
      <div className="cart-line-info">
        <div className="cart-line-top">
          <div>
            <p>{item.product.name}</p>
            <span>
              {item.color} · {item.size}
            </span>

            {nameset && (
              <div className="cart-custom-badge nameset-badge">
                <span>{t("🎽 PRINT:")}</span>
                <strong>{nameset.mode === "ready" ? nameset.name : `${nameset.name} #${nameset.number}`}</strong>
                {nameset.mode === "ready" && nameset.sku && <span className="sku-badge">{nameset.sku}</span>}
                <small>(+{formatPrice(nameset.price)})</small>
                {nameset.fontReference && (
                  <small className="cart-font-ref">
                    {t("Font ref:")} {nameset.fontReference.fileName}
                  </small>
                )}
              </div>
            )}

            {patch && (
              <div className="cart-custom-badge patch-badge">
                <span>{t("🛡️ PATCH:")}</span>
                <strong>{patch.name}</strong>
                <span className="sku-badge">{patch.sku}</span>
                <small>(+{formatPrice(patch.price)})</small>
              </div>
            )}

            {itemNote && (
              <div className="cart-custom-note">
                <em>{t('Note: "{note}"', { note: itemNote })}</em>
              </div>
            )}

            {problem && (
              <div className="cart-line-problem" role="alert">
                <AlertTriangle size={13} />
                <span>
                  {problem} {t("Remove this item and personalise it again from the product page.")}
                </span>
              </div>
            )}
          </div>
          <button disabled={disabled} onClick={() => removeItem(item.key)} aria-label={t("Remove {name}", { name: item.product.name })}>
            {t("Remove")}
          </button>
        </div>
        <div className="cart-line-bottom">
          <div className="quantity-control">
            <button
              disabled={disabled}
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              aria-label={t("Decrease quantity")}
            >
              <Minus size={13} />
            </button>
            <span>{item.quantity}</span>
            <button
              disabled={disabled}
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              aria-label={t("Increase quantity")}
            >
              <Plus size={13} />
            </button>
          </div>
          <strong>{formatPrice((item.unitPrice || item.product.price) * item.quantity)}</strong>
        </div>
      </div>
    </article>
  );
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const formatPrice = useFormatPrice();
  const { region, isBaseCurrency } = useRegion();
  const { items, itemCount, subtotal, orderNotes, setOrderNotes, clearCart } = useCart();
  const [stage, setStage] = useState<DrawerStage>("bag");
  const [reference, setReference] = useState("");
  const authQuery = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const user = authQuery.data;

  const [checkoutAuthTab, setCheckoutAuthTab] = useState<CheckoutAuthTab>("register");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [, navigate] = useLocation();

  // Each bag line is checked with the checkout rules, so incomplete customisations block payment up front.
  const cartValidation = trpc.catalog.validateCart.useQuery(
    { items: toOrderItems(items) },
    { enabled: open && items.length > 0, staleTime: 30 * 1000 }
  );
  const lineProblems = cartValidation.data ?? [];
  const hasCartProblems = lineProblems.some(line => line.error);
  const isCheckingCart = cartValidation.isFetching && !cartValidation.data;

  const wiseConfig = trpc.wise.config.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const wiseCurrencies = wiseConfig.data?.currencies ?? [];
  const [wiseCurrency, setWiseCurrency] = useState("");
  // Default to the visitor's own currency when the Wise account can receive it.
  useEffect(() => {
    if (wiseCurrency || wiseCurrencies.length === 0) return;
    setWiseCurrency(wiseCurrencies.includes(region.currency) ? region.currency : wiseCurrencies[0]);
  }, [wiseCurrencies, wiseCurrency, region.currency]);

  // Prefill the contact form from the signed-in account without overwriting what was typed.
  useEffect(() => {
    if (!user) return;
    if (user.name) setCustomerName(current => current || user.name || "");
    if (user.email) setCustomerEmail(current => current || user.email || "");
  }, [user]);

  // Carry the bag notes over to the checkout notes.
  useEffect(() => {
    if (orderNotes) setCustomerNotes(current => current || orderNotes);
  }, [orderNotes]);

  const wiseCheckout = trpc.wise.createTransfer.useMutation({
    onSuccess: data => {
      saveCustomerOrder({
        reference: data.reference,
        subtotal,
        currency: "IDR",
        status: "new",
        createdAt: new Date().toISOString(),
        paymentMethod: "wise",
      });
      clearCart();
      setStage("bag");
      onClose();
      navigate(`/order-success?provider=wise&ref=${encodeURIComponent(data.reference)}`);
    },
    onError: error => toast.error(error.message || t("Failed to start the Wise payment")),
  });

  const cryptoCheckout = trpc.crypto.createInvoice.useMutation({
    onSuccess: data => {
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        toast.error(t("Failed to generate Crypto invoice URL"));
      }
    },
    onError: error => toast.error(error.message || t("Failed to initiate Crypto payment")),
  });

  const loginCustomer = trpc.auth.loginCustomer.useMutation({
    onSuccess: async data => {
      await utils.auth.me.invalidate();
      setCustomerName(data.user.name || "");
      setCustomerEmail(data.user.email || "");
      if (data.user.phone) setCustomerPhone(data.user.phone);
      setCustomerPassword("");
      // Order history is cached per account, so refresh it for the account that just signed in.
      await utils.orderRequests.myOrders.invalidate();
      // Back to the bag, where the payment options are now unlocked.
      setStage("bag");
      toast.success(t("Welcome, {name}", { name: data.user.name || t("Customer") }));
    },
    onError: err => toast.error(err.message || t("Failed to sign in")),
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
      toast.success(t("Order request received."));
    },
    onError: error => toast.error(error.message || t("Your order request could not be sent.")),
  });

  const checkoutEmail = user?.email || customerEmail || undefined;

  const dismiss = () => {
    setStage("bag");
    setReference("");
    onClose();
  };

  // Every way of paying needs a signed-in account (so the order lands in "My Orders") and a complete bag.
  const canCheckout = Boolean(user) && !hasCartProblems && !isCheckingCart;

  const handlePayWithWise = () => {
    if (!canCheckout || !items.length || wiseCheckout.isPending || !wiseCurrency) return;
    wiseCheckout.mutate({
      items: toOrderItems(items),
      currency: wiseCurrency,
      customerName: user?.name || customerName || undefined,
      customerEmail: checkoutEmail,
    });
  };

  const handlePayWithCrypto = () => {
    if (!canCheckout || !items.length || cryptoCheckout.isPending) return;
    cryptoCheckout.mutate({ items: toOrderItems(items), customerEmail: checkoutEmail });
  };

  const handleStartRequest = () => {
    if (!user) {
      setStage("auth");
      return;
    }
    if (!canCheckout) return;
    setCustomerName(user.name || "");
    setCustomerEmail(user.email || "");
    setStage("request");
  };

  const handleCheckoutAuth = (event: FormEvent) => {
    event.preventDefault();
    if (!customerEmail) {
      toast.error(t("Please provide your email address"));
      return;
    }
    if (customerPassword.length < 8) {
      toast.error(t("Password must be at least 8 characters"));
      return;
    }
    loginCustomer.mutate({
      name: customerName || customerEmail.split("@")[0],
      email: customerEmail,
      phone: customerPhone || undefined,
      password: customerPassword,
      loginMethod: checkoutAuthTab === "register" ? "checkout_register" : "checkout_login",
    });
  };

  const sendRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length || submitRequest.isPending) return;
    const values = new FormData(event.currentTarget);

    submitRequest.mutate({
      customerName: String(values.get("customerName") || customerName || ""),
      email: String(values.get("email") || customerEmail || ""),
      phone: String(values.get("phone") || customerPhone || ""),
      notes: String(values.get("notes") || customerNotes || orderNotes || ""),
      items: toOrderItems(items),
    });
  };

  // Counts pieces (quantities), matching the "BAG n" counter in the header.
  const bagTitle = itemCount
    ? t(itemCount === 1 ? "{count} piece" : "{count} pieces", { count: itemCount })
    : "Your bag is empty";
  const heading = stage === "bag" ? { eyebrow: "Your bag", title: bagTitle } : STAGE_HEADINGS[stage];
  const controlsDisabled = stage !== "bag" || submitRequest.isPending;

  return (
    <>
      <button
        aria-label={t("Close shopping bag overlay")}
        className={`cart-scrim ${open ? "is-open" : ""}`}
        onClick={dismiss}
      />
      <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-label={t("Shopping bag")} aria-hidden={!open}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">{t(heading.eyebrow)}</p>
            <h2>{t(heading.title)}</h2>
          </div>
          <button className="icon-button" onClick={dismiss} aria-label={t("Close shopping bag")}>
            <X size={20} />
          </button>
        </div>

        {stage === "sent" && (
          <div className="request-confirmation">
            <CheckCircle2 size={34} strokeWidth={1.25} />
            <p className="eyebrow">{t("Reference {reference}", { reference })}</p>
            <h3>{t("Thanks for your request.")}</h3>
            <p>{t("We will review the pieces and contact you to arrange payment and delivery.")}</p>
            <div className="request-confirmation-actions">
              <Link href={`/orders?ref=${reference}`} className="primary-button" onClick={dismiss}>
                {t("Track Order Status →")}
              </Link>
              <button className="secondary-button" onClick={dismiss}>
                {t("Continue browsing")}
              </button>
            </div>
          </div>
        )}

        {stage === "auth" && (
          <div className="request-form">
            <button className="request-back" type="button" onClick={() => setStage("bag")}>
              <ArrowLeft size={15} /> {t("Back to bag")}
            </button>

            <div className="auth-tabs checkout-auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${checkoutAuthTab === "register" ? "active" : ""}`}
                onClick={() => setCheckoutAuthTab("register")}
              >
                {t("New here? Register")}
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${checkoutAuthTab === "login" ? "active" : ""}`}
                onClick={() => setCheckoutAuthTab("login")}
              >
                {t("Have an account? Sign in")}
              </button>
            </div>

            <p className="request-intro">
              {t(
                checkoutAuthTab === "register"
                  ? "Register to save your phone number and address, and to follow your shipment automatically."
                  : "Sign in with your account email so your order details are linked right away."
              )}
            </p>

            <form onSubmit={handleCheckoutAuth} className="login-form">
              {checkoutAuthTab === "register" && (
                <label>
                  {t("Full name *")}
                  <input
                    type="text"
                    required
                    placeholder={t("e.g. Dimas Wardhana")}
                    value={customerName}
                    onChange={event => setCustomerName(event.target.value)}
                  />
                </label>
              )}

              <label>
                {t("Email Address *")}
                <input
                  type="email"
                  required
                  placeholder="dimas@example.com"
                  value={customerEmail}
                  onChange={event => setCustomerEmail(event.target.value)}
                />
              </label>

              <label>
                {t("Password *")}
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={t(checkoutAuthTab === "register" ? "At least 8 characters" : "Your password")}
                  value={customerPassword}
                  onChange={event => setCustomerPassword(event.target.value)}
                  autoComplete={checkoutAuthTab === "register" ? "new-password" : "current-password"}
                />
              </label>

              <label>
                {t("WhatsApp / phone number *")}
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={customerPhone}
                  onChange={event => setCustomerPhone(event.target.value)}
                />
              </label>

              <button
                type="submit"
                className={`primary-button full-width checkout-auth-submit ${loginCustomer.isPending ? "is-loading" : ""}`}
                disabled={loginCustomer.isPending}
              >
                {t(
                  loginCustomer.isPending
                    ? "Connecting..."
                    : checkoutAuthTab === "register"
                      ? "Register & continue"
                      : "Sign in & continue"
                )}
              </button>

            </form>
          </div>
        )}

        {stage === "request" && (
          <form className="request-form" onSubmit={sendRequest}>
            <button className="request-back" type="button" onClick={() => setStage("bag")}>
              <ArrowLeft size={15} /> {t("Back to bag")}
            </button>
            <p className="request-intro">
              {t("Please check the details below. Our team will contact you to confirm delivery and tracking.")}
            </p>
            <label>
              {t("Name")}
              <input
                name="customerName"
                autoComplete="name"
                required
                minLength={2}
                placeholder={t("Your name")}
                value={customerName || user?.name || ""}
                onChange={event => setCustomerName(event.target.value)}
              />
            </label>
            <label>
              {t("Email")}
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={customerEmail || user?.email || ""}
                onChange={event => setCustomerEmail(event.target.value)}
              />
            </label>
            <label>
              {t("Phone")}
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                minLength={6}
                placeholder="081234567890"
                value={customerPhone}
                onChange={event => setCustomerPhone(event.target.value)}
              />
            </label>
            <label>
              {t("Notes")} <span>{t("optional")}</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder={t("Delivery address, courier preference, or sizing note")}
                value={customerNotes}
                onChange={event => setCustomerNotes(event.target.value)}
              />
            </label>
            <div className="request-total">
              <span>{t("Requested total")}</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <button
              className={`primary-button checkout-button ${submitRequest.isPending ? "is-loading" : ""}`}
              type="submit"
              disabled={submitRequest.isPending}
            >
              {submitRequest.isPending ? (
                <>
                  <LoaderCircle size={16} className="button-spinner" /> {t("Sending request...")}
                </>
              ) : (
                <>
                  <ClipboardPenLine size={16} /> {t("Send order request")}
                </>
              )}
            </button>
          </form>
        )}

        {stage === "bag" && (
          <>
            <div className="drawer-body">
              {items.length ? (
                items.map((item, index) => (
                  <CartLine key={item.key} item={item} disabled={controlsDisabled} problem={lineProblems[index]?.error} />
                ))
              ) : (
                <div className="empty-bag">
                  <p>{t("Your selections will stay here while you browse.")}</p>
                  <Link href="/shop" onClick={dismiss}>
                    {t("Discover the drop")}
                  </Link>
                </div>
              )}

              {!!items.length && (
                <div className="cart-order-notes-box">
                  <label htmlFor="cart-order-notes" className="order-notes-label">
                    <strong>{t("Order notes")}</strong>
                    <span>{t("Customisation, patch placement, or delivery instructions")}</span>
                  </label>
                  <textarea
                    id="cart-order-notes"
                    rows={2}
                    maxLength={500}
                    placeholder={t("Write a note here... (e.g. UCL font, patch on the right sleeve, send before Friday)")}
                    value={orderNotes}
                    onChange={event => {
                      setOrderNotes(event.target.value);
                      setCustomerNotes(event.target.value);
                    }}
                  />
                </div>
              )}
            </div>

            {!!items.length && (
              <div className="drawer-foot">
                <div className="summary-row">
                  <span>{t("Subtotal")}</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                {!isBaseCurrency && (
                  <p className="currency-note">
                    {t(
                      "Prices in {currency} are estimates. Orders are charged in Indonesian rupiah ({amount}), converted by your payment provider.",
                      { currency: region.currency, amount: formatInRegion(subtotal, DEFAULT_REGION) }
                    )}
                  </p>
                )}
                {hasCartProblems && (
                  <p className="checkout-blocker" role="alert">
                    <AlertTriangle size={14} />
                    {t("Some items in your bag are incomplete. Fix the highlighted items before paying.")}
                  </p>
                )}

                {!user ? (
                  <div className="checkout-actions">
                    <p className="checkout-signin-note">{t("Sign in or create an account to pay. Your order will be saved to My Orders.")}</p>
                    <button className="primary-button checkout-button" onClick={() => setStage("auth")}>
                      <LogIn size={16} /> {t("Sign in to checkout")}
                    </button>
                  </div>
                ) : (
                <div className="checkout-actions">
                  <div className="wise-checkout-box">
                    <label className="wise-currency-row">
                      {t("Pay by bank transfer in")}
                      <select
                        value={wiseCurrency}
                        onChange={event => setWiseCurrency(event.target.value)}
                        disabled={!wiseConfig.data?.enabled}
                      >
                        {wiseCurrencies.map(code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={`primary-button checkout-button card-checkout-button ${wiseCheckout.isPending ? "is-loading" : ""}`}
                      onClick={handlePayWithWise}
                      disabled={!canCheckout || !wiseConfig.data?.enabled || wiseCheckout.isPending || !wiseCurrency}
                    >
                      {wiseCheckout.isPending ? (
                        <>
                          <LoaderCircle size={16} className="button-spinner" /> {t("Preparing Wise transfer...")}
                        </>
                      ) : (
                        <>
                          <Landmark size={16} /> {t("Pay with Wise (bank transfer) ·")} {formatPrice(subtotal)}
                        </>
                      )}
                    </button>
                    <p className="wise-hint">
                      {t(
                        wiseConfig.data?.enabled
                          ? "Next you will see our Wise bank details and the exact amount, converted with Wise's live exchange rate. Pay from any bank app."
                          : "Wise bank transfer is not available right now."
                      )}
                    </p>
                  </div>

                  <button
                    className={`secondary-button crypto-checkout-button ${cryptoCheckout.isPending ? "is-loading" : ""}`}
                    onClick={handlePayWithCrypto}
                    disabled={!canCheckout || cryptoCheckout.isPending}
                  >
                    {cryptoCheckout.isPending ? (
                      <>
                        <LoaderCircle size={16} className="button-spinner" /> {t("Generating Crypto Invoice...")}
                      </>
                    ) : (
                      <>
                        <Coins size={16} /> {t("Pay with Crypto (USDT / BTC)")}
                      </>
                    )}
                  </button>

                  <button
                    className="secondary-button request-checkout-button"
                    onClick={handleStartRequest}
                    disabled={!canCheckout}
                  >
                    <ClipboardPenLine size={14} /> {t("Request these pieces")}
                  </button>
                </div>
                )}

                <button className="text-button drawer-text-action" onClick={clearCart}>
                  {t("Clear bag")}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
