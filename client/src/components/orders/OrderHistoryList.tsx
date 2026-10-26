import { useT } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { CheckCircle2, LoaderCircle, ShoppingBag, Store, Truck } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { Link } from "wouter";
import { OrderLineItems, type TrackedOrder } from "./OrderLineItems";
import { statusColorStyle } from "./OrderTrackingDetail";

type Props = {
  orders: TrackedOrder[];
  isLoading: boolean;
  onOpen: (reference: string) => void;
  onReorder: (order: TrackedOrder) => void;
  onViewDemo: () => void;
};

const TABS: Array<{ id: string; label: string; matches: (order: TrackedOrder) => boolean }> = [
  { id: "all", label: "All Orders", matches: () => true },
  { id: "new", label: "Awaiting / New", matches: order => order.status === "new" },
  { id: "packing", label: "In Packaging", matches: order => order.status === "contacted" && order.currentStep === 3 },
  { id: "transit", label: "In Transit", matches: order => order.status === "closed" && order.currentStep === 4 },
  { id: "closed", label: "Delivered", matches: order => order.status === "closed" },
];

/** Runs a card action without also triggering the card's own "open order" click. */
const withoutOpening = (action: () => void) => (event: MouseEvent) => {
  event.stopPropagation();
  action();
};

function OrderCard({ order, onOpen, onReorder }: Pick<Props, "onOpen" | "onReorder"> & { order: TrackedOrder }) {
  const t = useT();
  const itemCount = order.items.length;

  return (
    <div
      className="ot-card ot-order-card"
      style={statusColorStyle(order.statusColor)}
      onClick={() => onOpen(order.reference)}
    >
      <div className="ot-order-head">
        <div className="ot-store">
          <Store size={15} />
          <span>{t("CFJ Official Store")}</span>
          <code>· #{order.reference}</code>
        </div>
        <span className="ot-status-pill is-compact">
          <CheckCircle2 size={13} /> {t(order.statusBadge)}
        </span>
      </div>

      <div className="ot-order-body">
        <OrderLineItems items={order.items} variant="summary" />
      </div>

      <div className="ot-order-foot">
        <div className="ot-order-total">
          <span>
            {t(itemCount > 1 ? "Total ({count} items):" : "Total ({count} item):", { count: itemCount })}{" "}
          </span>
          <strong>{formatPrice(order.subtotal)}</strong>
        </div>

        <div className="ot-order-actions">
          <button type="button" className="secondary-button ot-btn-sm" onClick={withoutOpening(() => onReorder(order))}>
            {t("Buy Again")}
          </button>
          <button type="button" className="primary-button ot-btn-sm" onClick={withoutOpening(() => onOpen(order.reference))}>
            <Truck size={13} /> {t("Track Package")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "My Orders" view: status tabs over the signed-in account's order history. */
export function OrderHistoryList({ orders, isLoading, onOpen, onReorder, onViewDemo }: Props) {
  const t = useT();
  const [activeTabId, setActiveTabId] = useState(TABS[0].id);

  const tabs = useMemo(
    () => TABS.map(tab => ({ ...tab, orders: orders.filter(tab.matches) })),
    [orders]
  );
  const visibleOrders = tabs.find(tab => tab.id === activeTabId)?.orders ?? [];

  return (
    <div>
      <div className="ot-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`ot-tab ${tab.id === activeTabId ? "is-active" : ""}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            {t(tab.label)}
            {tab.orders.length > 0 && <span className="ot-tab-count">{tab.orders.length}</span>}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="ot-state">
          <LoaderCircle className="animate-spin" size={32} />
          <p>{t("Loading your purchase history...")}</p>
        </div>
      )}

      {!isLoading && visibleOrders.length === 0 && (
        <div className="ot-empty">
          <ShoppingBag size={40} strokeWidth={1.2} />
          <h3>{t("No Orders in This Status")}</h3>
          <p>{t("You do not have any orders matching this category. Explore our archive collection to begin.")}</p>
          <div className="ot-button-row">
            <button type="button" onClick={onViewDemo} className="secondary-button ot-btn">
              {t("View Demo Order (TR-READY123)")}
            </button>
            <Link href="/shop" className="primary-button ot-btn">
              {t("Explore Shop")}
            </Link>
          </div>
        </div>
      )}

      {!isLoading && visibleOrders.length > 0 && (
        <div className="ot-order-list">
          {visibleOrders.map(order => (
            <OrderCard key={order.reference} order={order} onOpen={onOpen} onReorder={onReorder} />
          ))}
        </div>
      )}
    </div>
  );
}
