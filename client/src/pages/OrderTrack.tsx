import { useT } from "@/i18n";
import { PageEntrance } from "@/components/MotionReveal";
import { OrderHistoryList } from "@/components/orders/OrderHistoryList";
import type { TrackedItem, TrackedOrder } from "@/components/orders/OrderLineItems";
import { OrderTrackingDetail } from "@/components/orders/OrderTrackingDetail";
import "@/components/orders/orders.css";
import { useCart } from "@/contexts/CartContext";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";
import type { Product } from "@/data/catalog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, HelpCircle, LoaderCircle, Lock, RefreshCw, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";

const DEMO_REFERENCE = "TR-READY123";
const REORDER_IMAGE = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800";
const REORDER_FALLBACK_PRICE = 785000;

/** Rebuilds a bag-ready product from a past order line (base price without nameset / patch add-ons). */
function toReorderProduct(item: TrackedItem): Product {
  const addOns = (item.customization?.nameset?.price || 0) + (item.customization?.patch?.price || 0);
  const id = item.productId || "terrace-piece";
  return {
    id,
    slug: id,
    name: item.name,
    collection: "Apparel",
    price: Math.max(0, (item.unitAmount || REORDER_FALLBACK_PRICE) - addOns),
    publishedAt: "",
    image: REORDER_IMAGE,
    gallery: [REORDER_IMAGE],
    colors: [item.color || "Standard"],
    sizes: [item.size || "M"],
    material: "",
    fit: "",
    story: "Archival piece reordered from past purchase.",
    details: [],
  };
}

/** Keeps the address bar in sync with the order being viewed, without a navigation. */
const syncUrl = (reference: string) =>
  window.history.replaceState(null, "", reference ? `/orders?ref=${encodeURIComponent(reference)}` : "/orders");

export default function OrderTrack() {
  const t = useT();
  const initialRef = new URLSearchParams(useSearch()).get("ref") || "";

  const [inputRef, setInputRef] = useState(initialRef);
  const [activeRef, setActiveRef] = useState(initialRef);
  const [authOpen, setAuthOpen] = useState(false);
  const { addItem } = useCart();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  // Follow links that change ?ref= while this page stays mounted.
  useEffect(() => {
    if (!initialRef) return;
    setInputRef(initialRef);
    setActiveRef(initialRef);
  }, [initialRef]);

  const trackQuery = trpc.orderRequests.track.useQuery(
    { reference: activeRef },
    { enabled: activeRef.trim().length > 0, retry: false }
  );

  // Order history belongs to the signed-in account; visitors only get reference tracking.
  const myOrdersQuery = trpc.orderRequests.myOrders.useQuery(undefined, { enabled: !!user, staleTime: 10000 });

  const openOrder = (reference: string) => {
    setInputRef(reference);
    setActiveRef(reference);
    syncUrl(reference);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToList = () => {
    setInputRef("");
    setActiveRef("");
    syncUrl("");
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const reference = inputRef.trim();
    if (!reference) {
      toast.error(t("Please enter an order reference or tracking code."));
      return;
    }
    setActiveRef(reference);
    syncUrl(reference);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("{label} copied to clipboard!", { label: t(label) }));
  };

  const reorder = (order: TrackedOrder) => {
    if (!order.items.length) return;
    for (const item of order.items) {
      addItem(toReorderProduct(item), item.color || "Standard", item.size || "M", item.customization || undefined);
    }
    toast.success(
      t(order.items.length > 1 ? "{count} items added back to Bag!" : "{count} item added back to Bag!", {
        count: order.items.length,
      })
    );
  };

  return (
    <PageEntrance>
      <div className="container order-track">
        <div className="ot-topbar">
          {activeRef ? (
            <button type="button" className="ot-back-link" onClick={backToList}>
              <ArrowLeft size={14} /> {t("Back to All Orders")}
            </button>
          ) : (
            <>
              <Link href="/shop" className="ot-back-link">
                <ArrowLeft size={14} /> {t("Back to Shop")}
              </Link>
              {user && (
                <button
                  type="button"
                  className="ot-refresh"
                  onClick={() => myOrdersQuery.refetch()}
                  title={t("Refresh order list")}
                >
                  <RefreshCw size={12} className={myOrdersQuery.isFetching ? "animate-spin" : ""} /> {t("Refresh")}
                </button>
              )}
            </>
          )}
        </div>

        <div className="ot-header">
          <p className="eyebrow ot-eyebrow">{t("Client Services & Archive Dispatch")}</p>
          <h1>{t(activeRef ? "Order & Transit Details" : "My Orders & Dispatch Tracking")}</h1>
          <p className="ot-lede">
            {t("Review past archival purchases and track real-time garment curation, quality control, packaging, and courier transit.")}
          </p>

          <form className="ot-search" onSubmit={handleSearch}>
            <div className="ot-search-field">
              <Search size={18} />
              <input
                type="text"
                aria-label={t("Order reference")}
                value={inputRef}
                onChange={event => setInputRef(event.target.value)}
                placeholder={t("Search Order Ref or Waybill...")}
              />
            </div>
            <button type="submit" className="primary-button ot-search-submit">
              {trackQuery.isFetching ? <LoaderCircle className="animate-spin" size={15} /> : t("Track")}
            </button>
          </form>
        </div>

        {activeRef ? (
          <div>
            {trackQuery.isLoading && (
              <div className="ot-state">
                <LoaderCircle className="animate-spin" size={32} />
                <p>{t("Locating order {reference}...", { reference: activeRef })}</p>
              </div>
            )}

            {trackQuery.isError && (
              <div className="ot-error">
                <HelpCircle size={36} />
                <h3>{t("Order Reference Not Found")}</h3>
                <p>
                  {t("Reference code")} <strong>{activeRef}</strong> {t("has not been found. Please check your invoice email or transaction confirmation.")}
                </p>
                <div className="ot-button-row">
                  <button type="button" onClick={() => openOrder(DEMO_REFERENCE)} className="secondary-button ot-btn">
                    {t("View Demo Order ({reference})", { reference: DEMO_REFERENCE })}
                  </button>
                  <button type="button" onClick={backToList} className="primary-button ot-btn">
                    {t("Back to My Orders")}
                  </button>
                </div>
              </div>
            )}

            {trackQuery.data && (
              <OrderTrackingDetail order={trackQuery.data} onBack={backToList} onCopy={copyToClipboard} />
            )}
          </div>
        ) : user ? (
          <OrderHistoryList
            orders={myOrdersQuery.data ?? []}
            isLoading={myOrdersQuery.isLoading}
            onOpen={openOrder}
            onReorder={reorder}
            onViewDemo={() => openOrder(DEMO_REFERENCE)}
          />
        ) : authQuery.isLoading ? (
          <div className="ot-state">
            <LoaderCircle className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="ot-empty">
            <Lock size={40} strokeWidth={1.2} />
            <h3>{t("Sign in to see your orders")}</h3>
            <p>{t("Your order history is private to your account. You can still track any order above with its reference code.")}</p>
            <div className="ot-button-row">
              <button type="button" onClick={() => setAuthOpen(true)} className="primary-button ot-btn">
                {t("Sign In")}
              </button>
            </div>
          </div>
        )}
      </div>
      <CustomerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PageEntrance>
  );
}
