import { useT } from "@/i18n";
import { FadeIn } from "@/components/MotionReveal";
import { formatPrice } from "@/lib/money";
import {
  Boxes,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  Package,
  PackageCheck,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import type { CSSProperties } from "react";
import { OrderLineItems, type TrackedOrder } from "./OrderLineItems";

type Props = {
  order: TrackedOrder;
  onBack: () => void;
  onCopy: (text: string, label: string) => void;
};

const STEPS = [
  { step: 1, title: "Placed", icon: Package },
  { step: 2, title: "Paid", icon: ShieldCheck },
  { step: 3, title: "In Packaging", icon: Boxes },
  { step: 4, title: "Dispatched", icon: Truck },
  { step: 5, title: "Delivered", icon: PackageCheck },
];
const LAST_STEP = STEPS.length;

/** What the customer is told at each step; the server's wording is English-only, so it is rebuilt here. */
const STATUS_DESCRIPTIONS: Record<number, string> = {
  1: "Your order has been recorded. Our studio is preparing your pieces for quality inspection and packaging.",
  2: "Payment confirmed. Your pieces are queued for packaging.",
  3: "Your pieces have passed inspection and are being packaged.",
  4: "Your package has been dispatched with {courier}. Waybill No: {waybill}.",
  5: "Your package has been delivered by {courier}. Waybill: {waybill}.",
};

/** WhatsApp number of the store concierge, in international format without "+". */
const CONCIERGE_WHATSAPP = "6281234567890";

/** Exposes the API-provided status colour to the stylesheet. */
export const statusColorStyle = (color: string) => ({ "--status-color": color }) as CSSProperties;

const formatPlacedAt = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function ProgressStepper({ order }: { order: TrackedOrder }) {
  const t = useT();
  const progress = Math.min(100, Math.max(0, ((order.currentStep - 1) / (LAST_STEP - 1)) * 100));

  return (
    <div className="ot-stepper">
      <div className="ot-stepper-track">
        <div className="ot-stepper-progress" style={{ width: `${progress}%` }} />
      </div>
      {STEPS.map(({ step, title, icon: Icon }) => {
        const isDone = order.currentStep >= step || (step === LAST_STEP && order.status === "closed");
        const isCurrent = order.currentStep === step;
        return (
          <div key={step} className={`ot-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}>
            <div className="ot-step-dot">
              <Icon size={17} />
            </div>
            <span className="ot-step-label">{t(title)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Full tracking view for one order: status, timeline, courier, recipient, and purchased pieces. */
export function OrderTrackingDetail({ order, onBack, onCopy }: Props) {
  const t = useT();
  const conciergeMessage = t("Hello CFJ Concierge, I would like to inquire regarding order reference: {reference}", {
    reference: order.reference,
  });

  return (
    <FadeIn>
      <div className="ot-card" style={statusColorStyle(order.statusColor)}>
        <div className="ot-card-banner">
          <div>
            <div className="ot-reference-row">
              <span className="ot-label">{t("Order Reference:")}</span>
              <span className="ot-reference">{order.reference}</span>
              <button
                type="button"
                className="ot-icon-button"
                onClick={() => onCopy(order.reference, "Order reference")}
                title={t("Copy reference code")}
              >
                <Copy size={14} />
              </button>
            </div>
            <p className="ot-meta">{t("Placed on:")} {formatPlacedAt(order.createdAt)}</p>
          </div>

          <div className="ot-banner-status">
            <span className="ot-status-pill">
              <CheckCircle2 size={15} /> {t(order.statusBadge)}
            </span>
            <p className="ot-meta">
              {t("Estimated Delivery:")} <strong>{order.estimatedDelivery}</strong>
            </p>
          </div>
        </div>

        <div className="ot-section">
          <h3 className="ot-section-title">{t("Fulfillment & Transit Timeline")}</h3>
          <ProgressStepper order={order} />
          <div className="ot-status-note">
            <p>
              <strong>{t("Current Status:")}</strong>{" "}
              {t(STATUS_DESCRIPTIONS[order.currentStep] ?? STATUS_DESCRIPTIONS[1], {
                courier: order.courierName,
                waybill: order.trackingNumber,
              })}
            </p>
          </div>
        </div>

        <div className="ot-details-grid">
          <div>
            <div className="ot-detail-heading">
              <Truck size={15} /> {t("Logistics & Courier")}
            </div>
            <p className="ot-detail-primary">{order.courierName}</p>
            <div className="ot-waybill">
              <span>{t("Waybill:")}</span>
              <strong>{order.trackingNumber}</strong>
              <button
                type="button"
                className="ot-icon-button"
                onClick={() => onCopy(order.trackingNumber, "Waybill / Resi")}
                title={t("Copy Waybill No")}
              >
                <Copy size={13} />
              </button>
            </div>
            {order.trackingUrl && (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="ot-courier-link">
                {t("Track on Courier Website")} <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div>
            <div className="ot-detail-heading">
              <User size={15} /> {t("Recipient & Contact")}
            </div>
            <p className="ot-detail-primary">{order.customerName}</p>
            <p className="ot-detail-secondary">
              {order.email} · {order.phone}
            </p>
            {order.notes && <p className="ot-detail-note">{t('Notes: "{notes}"', { notes: order.notes })}</p>}
          </div>
        </div>

        <div className="ot-section is-items">
          <h3 className="ot-section-title">{t("Purchased Pieces ({count})", { count: order.items.length })}</h3>
          <OrderLineItems items={order.items} variant="detail" />
          <div className="ot-total">
            <span>{t("Total Paid")}</span>
            <strong>{formatPrice(order.subtotal)}</strong>
          </div>
        </div>

        <div className="ot-card-actions">
          <button type="button" onClick={onBack} className="secondary-button ot-btn">
            {t("← Back to All Orders")}
          </button>
          <a
            href={`https://wa.me/${CONCIERGE_WHATSAPP}?text=${encodeURIComponent(conciergeMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button ot-btn"
          >
            <MessageSquare size={14} /> {t("Contact Concierge")}
          </a>
        </div>
      </div>
    </FadeIn>
  );
}
