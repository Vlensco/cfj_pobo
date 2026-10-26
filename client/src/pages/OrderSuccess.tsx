import { useT } from "@/i18n";
import "@/components/orders/order-success.css";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/money";
import { saveCustomerOrder } from "@/lib/orderStorage";
import { trpc } from "@/lib/trpc";
import { fromMinorUnits } from "@shared/currency";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  LoaderCircle,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";

type Provider = "stripe" | "wise" | "nowpayments";

const PROVIDER_LABELS: Record<Provider, string> = {
  stripe: "Payment confirmed · Stripe",
  wise: "Payment confirmed · Wise",
  nowpayments: "Crypto payment successful",
};

const FULFILMENT_STEPS = [
  { label: "1. Verified", description: "Payment received", done: true },
  { label: "2. Being packed", description: "Quality Control", done: true },
  { label: "3. With courier", description: "Ready to ship", done: false },
  { label: "4. Delivered", description: "Estimated 2–4 days", done: false },
];

const GUARANTEES = [
  "Your order has been recorded in our system.",
  "Every piece goes through two quality checks before it is sealed and packed.",
];

/**
 * Works out which checkout the visitor returned from and the reference the
 * server stored for it. Returns null when the URL carries no order at all,
 * e.g. when the page is opened directly.
 */
function readCheckoutReturn(search: string): { provider: Provider; reference: string; sessionId?: string } | null {
  const params = new URLSearchParams(search);

  const sessionId = params.get("session_id");
  if (sessionId) return { provider: "stripe", reference: `TR-${sessionId.slice(-8).toUpperCase()}`, sessionId };

  const cryptoOrderId = params.get("order_id");
  if (cryptoOrderId) return { provider: "nowpayments", reference: cryptoOrderId };

  const wiseReference = params.get("provider") === "wise" ? params.get("ref") : null;
  if (wiseReference) return { provider: "wise", reference: wiseReference };

  return null;
}

export default function OrderSuccess() {
  const t = useT();
  const checkout = readCheckoutReturn(useSearch());
  const { clearCart } = useCart();
  const handledRef = useRef(false);

  const sessionQuery = trpc.stripe.getSessionStatus.useQuery(
    { sessionId: checkout?.sessionId || "" },
    { enabled: Boolean(checkout?.sessionId), staleTime: 60000 }
  );
  const wiseQuery = trpc.wise.instructions.useQuery(
    { reference: checkout?.reference || "" },
    { enabled: checkout?.provider === "wise", staleTime: 60000, retry: false }
  );

  // Empty the bag and remember the order in "My Orders", once per completed checkout.
  useEffect(() => {
    if (!checkout || handledRef.current) return;
    handledRef.current = true;
    clearCart();
    saveCustomerOrder({
      reference: checkout.reference,
      createdAt: new Date().toISOString(),
      paymentMethod: checkout.provider,
    });
  }, [checkout, clearCart]);

  if (!checkout) {
    return (
      <div className="container order-success is-centered">
        <Package size={32} />
        <p>{t("There is no order to confirm on this page.")}</p>
        <div className="os-actions">
          <Link href="/orders" className="secondary-button">
            <Truck size={16} /> {t("View my orders")}
          </Link>
          <Link href="/shop" className="primary-button">
            {t("Continue shopping")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (checkout.provider === "wise" && wiseQuery.isLoading) {
    return (
      <div className="container order-success is-centered">
        <LoaderCircle className="animate-spin" size={32} />
        <p>{t("Loading your Wise transfer details...")}</p>
      </div>
    );
  }

  if (checkout.provider === "stripe" && sessionQuery.isLoading) {
    return (
      <div className="container order-success is-centered">
        <LoaderCircle className="animate-spin" size={32} />
        <p>{t("Verifying payment status with Stripe...")}</p>
      </div>
    );
  }

  const session = sessionQuery.data;
  // Stripe is the only provider whose payment status can be confirmed from this page.
  const wise = wiseQuery.data;
  const isAwaitingPayment =
    (checkout.provider === "stripe" && session?.paymentStatus !== "paid") || (checkout.provider === "wise" && !wise?.isPaid);
  const currency = session?.currency || "IDR";
  const trackHref = `/track?ref=${encodeURIComponent(checkout.reference)}`;
  const BadgeIcon =
    checkout.provider === "wise" ? Landmark : isAwaitingPayment ? Clock : checkout.provider === "nowpayments" ? Coins : CreditCard;
  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(t("Copied to clipboard"));
  };

  const copyReference = () => {
    navigator.clipboard.writeText(checkout.reference);
    toast.success(t("Order reference copied!"));
  };

  return (
    <div className="container order-success">
      <div className="os-card">
        <div className="os-header">
          <div className={`os-check ${isAwaitingPayment ? "is-pending" : ""}`}>
            {isAwaitingPayment ? <Clock size={36} /> : <CheckCircle2 size={36} />}
          </div>

          <div className={`os-badge ${isAwaitingPayment ? "is-pending" : ""}`}>
            <BadgeIcon size={14} />
            {t(
              checkout.provider === "wise" && isAwaitingPayment
                ? "Awaiting your Wise bank transfer"
                : isAwaitingPayment
                  ? "Awaiting payment confirmation"
                  : PROVIDER_LABELS[checkout.provider]
            )}
          </div>

          <h1>{t(isAwaitingPayment ? "Order received" : "Order confirmed")}</h1>
          <p className="os-lede">
            {t(
              checkout.provider === "wise" && isAwaitingPayment
                ? "Transfer the exact amount below to our Wise account and use your order reference as the payment reference. We start preparing your order as soon as the transfer arrives."
                : isAwaitingPayment
                  ? "Your payment has not been confirmed yet. The order status will update automatically once payment is received."
                  : "Thank you for shopping with CFJ (cfjersey). Your pieces are being prepared for fulfilment and delivery."
            )}
          </p>
          <div className="os-reference">
            <span>{t("Reference code:")}</span>
            <strong>{checkout.reference}</strong>
            <button type="button" onClick={copyReference} title={t("Copy reference")}>
              <Copy size={15} />
            </button>
          </div>
        </div>

        {checkout.provider === "wise" && wiseQuery.isError && (
          <p className="wise-note is-warning">
            {t("The bank details could not be loaded. Please refresh this page or contact us with your reference code.")}
          </p>
        )}

        {wise && isAwaitingPayment && (
          <div className="wise-instructions">
            <div className="wise-amount">
              <span>{t("Amount to transfer")}</span>
              <strong>
                {wise.amount.toFixed(2)} {wise.currency}
              </strong>
            </div>
            <div className="wise-detail">
              <span>{t("Payment reference")}</span>
              <code>{wise.reference}</code>
              <button type="button" onClick={() => copyValue(wise.reference)} title={t("Copy")}>
                <Copy size={14} />
              </button>
            </div>
            {wise.receiveOptions.map(option => (
              <div className="wise-option" key={option.title}>
                <h4>{t(option.title)}</h4>
                {option.details.map(detail => (
                  <div className="wise-detail" key={detail.label}>
                    <span>{detail.label}</span>
                    <code>{detail.value}</code>
                    <button type="button" onClick={() => copyValue(detail.value)} title={t("Copy")}>
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <p className="wise-note">
              {t("Send exactly this amount in {currency}. Your bank may charge its own transfer fee.", {
                currency: wise.currency,
              })}
            </p>
            {wise.isSandboxPreview && (
              <p className="wise-note is-warning">{t("Wise sandbox: these are test account details, do not send real money.")}</p>
            )}
          </div>
        )}

        {!isAwaitingPayment && (
          <div className="os-panel">
            <div className="os-panel-head">
              <h3>
                <Truck size={18} /> {t("Order processing status")}
              </h3>
              <Link href={trackHref} className="os-track-link">
                {t("Track live")} <ExternalLink size={12} />
              </Link>
            </div>

            <div className="os-steps">
              {FULFILMENT_STEPS.map(step => (
                <div key={step.label} className={`os-step ${step.done ? "is-done" : ""}`}>
                  <strong>{t(step.label)}</strong>
                  <span>{t(step.description)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {session && (
          <div className="os-summary">
            <h3>{t("Order summary")}</h3>
            <div className="os-summary-lines">
              {session.lineItems.map((item, index) => (
                <div className="os-summary-line" key={index}>
                  <div>
                    <p>{item.description}</p>
                    <span>{t("Qty:")} {item.quantity}</span>
                  </div>
                  <strong>{formatPrice(fromMinorUnits(item.amount_total, currency))}</strong>
                </div>
              ))}
            </div>
            <div className="os-summary-total">
              <span>{t("Total payment")}</span>
              <strong>{formatPrice(fromMinorUnits(session.amountTotal, currency))}</strong>
            </div>
          </div>
        )}

        <div className="os-guarantee">
          <h3>
            <ShieldCheck size={18} /> {t("CFJ quality & delivery guarantee")}
          </h3>
          <ul>
            {GUARANTEES.map(guarantee => (
              <li key={guarantee}>{t(guarantee)}</li>
            ))}
            <li>
              {t("You can follow your delivery at any time from the menu:")} <strong>{t("Track Order")}</strong>.
            </li>
          </ul>
        </div>

        <div className="os-actions">
          <Link href={trackHref} className="secondary-button">
            <Truck size={16} /> {t("Track order status")}
          </Link>
          <Link href="/shop" className="primary-button">
            <Package size={16} /> {t("Continue shopping")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
