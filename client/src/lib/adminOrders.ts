import type { OrderRequestStatus } from "@shared/orderRequests";

export { parseRequestedPieces, type OrderRequestStatus, type RequestedPiece } from "@shared/orderRequests";

/** An order request row as shown in the admin dashboard. */
export type AdminOrder = {
  id: number;
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
};

export const ORDER_STATUS_LABELS: Record<OrderRequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

/** Fulfilment stages an admin can set, with the order status each one implies. */
export const FULFILLMENT_STAGES: Array<{ value: string; label: string; status: OrderRequestStatus }> = [
  { value: "placed", label: "1. Placed & Verified (Status: New)", status: "new" },
  { value: "in_packaging", label: "2. In Packaging & QC (Status: Contacted)", status: "contacted" },
  { value: "dispatched", label: "3. Dispatched / In Transit (Status: Closed - Resi Active)", status: "closed" },
  { value: "delivered", label: "4. Delivered to Recipient (Status: Closed)", status: "closed" },
];

/** The stage to show for an order: the saved one when it is known, otherwise derived from its status. */
export function resolveFulfillmentStage(order: Pick<AdminOrder, "fulfillmentStage" | "status">): string {
  if (FULFILLMENT_STAGES.some(stage => stage.value === order.fulfillmentStage)) return order.fulfillmentStage as string;
  if (order.status === "closed") return "dispatched";
  return order.status === "contacted" ? "in_packaging" : "placed";
}
