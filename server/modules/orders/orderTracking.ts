import { OrderRequestStatus, parseRequestedPieces } from "./adminOrders";

/** The order fields the public tracking page is built from, whatever table they came from. */
export type TrackableOrder = {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  notes: string | null;
  /** JSON-serialised `RequestedPiece[]`. */
  items: string;
  subtotal: number;
  currency: string;
  status: OrderRequestStatus;
  fulfillmentStage?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: Date | string;
  contactedAt: Date | string | null;
  userOpenId?: string | null;
};

type StatusView = {
  currentStep: number;
  statusBadge: string;
  statusBadgeEn: string;
  statusColor: string;
  statusDescription: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COURIER = "TERRACE Courier Express (JNE / SiCepat)";
const DEFAULT_TRACKING_PORTAL = "https://sicepat.com/checkAwb";

const COLOR_AMBER = "#eab308";
const COLOR_BLUE = "#3b82f6";
const COLOR_GREEN = "#16a34a";

/** Courier name keyword -> public tracking portal, checked in order. */
const COURIER_TRACKING_PORTALS: Array<[keywords: string[], url: string]> = [
  [["jne"], "https://www.jne.co.id/tracking"],
  [["j&t", "jet"], "https://jet.co.id/track"],
  [["dhl"], "https://www.dhl.com/en/express/tracking.html"],
  [["fedex"], "https://www.fedex.com/fedextrack/"],
  [["lion"], "https://lionparcel.com/track"],
  [["anteraja"], "https://anteraja.id/tracking"],
  [["pos"], "https://www.posindonesia.co.id/en/tracking"],
];

function resolveTrackingPortal(courierName: string): string {
  const courier = courierName.toLowerCase();
  const match = COURIER_TRACKING_PORTALS.find(([keywords]) => keywords.some(keyword => courier.includes(keyword)));
  return match ? match[1] : DEFAULT_TRACKING_PORTAL;
}

function resolveStatusView(order: TrackableOrder, courierName: string, trackingNumber: string): StatusView {
  const stage = order.fulfillmentStage;

  if (stage === "delivered") {
    return {
      currentStep: 5,
      statusBadge: "Delivered to Customer",
      statusBadgeEn: "Delivered & Received",
      statusColor: COLOR_GREEN,
      statusDescription: `Package has been successfully delivered by ${courierName}. Waybill: ${trackingNumber}.`,
    };
  }
  if (stage === "dispatched" || order.status === "closed") {
    return {
      currentStep: 4,
      statusBadge: "In Transit / Dispatched",
      statusBadgeEn: "Dispatched & In Transit",
      statusColor: COLOR_GREEN,
      statusDescription: `Your package has been dispatched with ${courierName}. Waybill No: ${trackingNumber} is active.`,
    };
  }
  if (stage === "in_packaging" || order.status === "contacted") {
    return {
      currentStep: 3,
      statusBadge: "Processing & In Packaging",
      statusBadgeEn: "Processing & In Packaging",
      statusColor: COLOR_BLUE,
      statusDescription:
        "Pieces have passed garment inspection and are being packaged in signature rigid archival boxes with authenticity seals.",
    };
  }
  if (stage === "paid") {
    return {
      currentStep: 2,
      statusBadge: "Payment Confirmed",
      statusBadgeEn: "Payment Confirmed",
      statusColor: COLOR_GREEN,
      statusDescription: "Payment authenticated and allocated for quality packaging.",
    };
  }
  return {
    currentStep: 1,
    statusBadge: "Order Received",
    statusBadgeEn: "Order Received & Verified",
    statusColor: COLOR_AMBER,
    statusDescription:
      "Your order has been recorded in the TERRACE archival system. Our studio is preparing pieces for quality inspection & small-batch packaging.",
  };
}

function stageFromStep(step: number): string {
  if (step >= 5) return "delivered";
  if (step === 4) return "dispatched";
  if (step === 3) return "in_packaging";
  return "placed";
}

/** Estimated delivery window: 2 to 4 days after the order was placed. */
function formatDeliveryWindow(createdAt: Date): string {
  const earliest = new Date(createdAt.getTime() + 2 * DAY_MS);
  const latest = new Date(createdAt.getTime() + 4 * DAY_MS);
  const from = earliest.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const to = latest.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${from} – ${to}`;
}

/** Turns a stored order into the status, courier, and timeline shown on the tracking page. */
export function buildTrackingDetails(order: TrackableOrder, now: Date = new Date()) {
  const createdAt = new Date(order.createdAt);
  const contactedAt = order.contactedAt ? new Date(order.contactedAt) : null;

  const courierName = order.courierName || DEFAULT_COURIER;
  const trackingNumber = order.trackingNumber || `TRC-${order.reference.replace(/^TR-/, "")}-ID`;
  const trackingUrl = order.trackingUrl || resolveTrackingPortal(courierName);

  const status = resolveStatusView(order, courierName, trackingNumber);
  const { currentStep } = status;
  const isDispatched = currentStep >= 4;
  const isDelivered = currentStep >= 5;

  const timeline = [
    {
      step: 1,
      title: "Order Placed & Verified",
      titleEn: "Order Placed & Verified",
      timestamp: createdAt.toISOString(),
      completed: true,
      description: "Order entry logged and garments reserved from archive inventory.",
    },
    {
      step: 2,
      title: "Payment Confirmed",
      titleEn: "Payment Confirmed",
      timestamp: createdAt.toISOString(),
      completed: currentStep >= 2,
      description: "Payment authenticated and allocated for archive dispatch.",
    },
    {
      step: 3,
      title: "Quality Inspection & Rigid Packaging",
      titleEn: "Processing & Quality Packing",
      timestamp: contactedAt ? contactedAt.toISOString() : null,
      completed: currentStep >= 3,
      description: "Garment stitching, fabric weight inspection, rigid archival box casing, and shipping label printing.",
    },
    {
      step: 4,
      title: "Dispatched & In Transit",
      titleEn: "Dispatched & In Transit",
      timestamp: isDispatched ? (contactedAt ?? createdAt).toISOString() : null,
      completed: isDispatched,
      description: `Package handed over to ${courierName} for delivery. Waybill: ${trackingNumber}.`,
    },
    {
      step: 5,
      title: "Delivered to Customer",
      titleEn: "Delivered to Customer",
      timestamp: isDelivered ? now.toISOString() : null,
      completed: isDelivered,
      description: "Parcel safely delivered to recipient address.",
    },
  ];

  return {
    reference: order.reference,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    notes: order.notes,
    items: parseRequestedPieces(order.items),
    subtotal: order.subtotal,
    currency: order.currency,
    status: order.status,
    fulfillmentStage: order.fulfillmentStage || stageFromStep(currentStep),
    ...status,
    estimatedDelivery: formatDeliveryWindow(createdAt),
    courierName,
    trackingNumber,
    trackingUrl,
    createdAt: createdAt.toISOString(),
    contactedAt: contactedAt ? contactedAt.toISOString() : null,
    timeline,
  };
}

export type OrderTrackingDetails = ReturnType<typeof buildTrackingDetails>;
