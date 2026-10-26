import { CustomizationBadges } from "@/components/orders/CustomizationBadges";
import { AdminOrder, parseRequestedPieces } from "@/lib/adminOrders";
import { formatPrice } from "@/lib/money";
import { ExternalLink, PackageOpen, Phone, X } from "lucide-react";
import { OrderShippingForm, type ShippingUpdate } from "./OrderShippingForm";

type Props = {
  order: AdminOrder | null;
  isSaving: boolean;
  readOnly: boolean;
  onClose: () => void;
  onSave: (update: ShippingUpdate) => void;
};

/** Side panel with the selected request's customer, pieces, note, and shipping editor. */
export function OrderDetailPanel({ order, isSaving, readOnly, onClose, onSave }: Props) {
  if (!order) {
    return (
      <aside className="order-detail" aria-live="polite">
        <div className="detail-placeholder">
          <PackageOpen size={29} strokeWidth={1.2} />
          <p>Select a request to view its customer details and pieces.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="order-detail" aria-live="polite">
      <div className="detail-title">
        <div>
          <p className="eyebrow">{order.reference}</p>
          <h2>{order.customerName}</h2>
        </div>
        <button className="icon-button" aria-label="Close order detail" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="detail-contact">
        <a href={`mailto:${order.email}`}>{order.email}</a>
        <a href={`tel:${order.phone}`}>
          <Phone size={13} /> {order.phone}
        </a>
        <a
          href={`/track?ref=${encodeURIComponent(order.reference)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="detail-tracking-link"
        >
          Live Customer Tracking <ExternalLink size={12} />
        </a>
      </div>

      <div className="detail-section">
        <p className="detail-label">Requested pieces</p>
        {parseRequestedPieces(order.items).map((piece, index) => (
          <div className="requested-piece" key={`${piece.productId}-${piece.color}-${piece.size}-${index}`}>
            <div className="requested-piece-info">
              <span>
                <strong>
                  {piece.quantity}× {piece.name}
                </strong>
                <small>
                  {piece.color} · {piece.size}
                </small>
              </span>
              <CustomizationBadges customization={piece.customization} />
            </div>
            <b>{formatPrice(piece.lineTotal)}</b>
          </div>
        ))}
        <div className="detail-total">
          <span>Requested total</span>
          <strong>{formatPrice(order.subtotal)}</strong>
        </div>
      </div>

      {order.notes && (
        <div className="detail-section">
          <p className="detail-label">Customer note</p>
          <p className="customer-note">{order.notes}</p>
        </div>
      )}

      <OrderShippingForm order={order} isPending={isSaving} disabled={readOnly} onSave={onSave} />
    </aside>
  );
}
