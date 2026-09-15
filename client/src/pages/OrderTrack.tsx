import { FadeIn, PageEntrance } from "@/components/MotionReveal";
import { formatPrice } from "@/lib/money";
import { getSavedCustomerOrderRefs, removeCustomerOrder } from "@/lib/orderStorage";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";

type OrderFilterTab = "all" | "new" | "packing" | "transit" | "closed";

export default function OrderTrack() {
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const initialRef = searchParams.get("ref") || "";

  const [inputRef, setInputRef] = useState(initialRef);
  const [activeRef, setActiveRef] = useState(initialRef);
  const [selectedTab, setSelectedTab] = useState<OrderFilterTab>("all");
  const [savedRefs, setSavedRefs] = useState<string[]>([]);
  const { addItem } = useCart();

  const authQuery = trpc.auth.me.useQuery();

  useEffect(() => {
    const refs = getSavedCustomerOrderRefs();
    setSavedRefs(refs);
  }, []);

  useEffect(() => {
    if (initialRef && initialRef !== activeRef) {
      setInputRef(initialRef);
      setActiveRef(initialRef);
    }
  }, [initialRef]);

  // Single order tracking query (when a specific ref is searched/viewed)
  const trackQuery = trpc.orderRequests.track.useQuery(
    { reference: activeRef },
    {
      enabled: Boolean(activeRef && activeRef.trim().length > 0),
      retry: false,
    }
  );

  // Customer order history query (from saved references & session email)
  const myOrdersQuery = trpc.orderRequests.myOrders.useQuery(
    {
      references: savedRefs.length > 0 ? savedRefs : ["TR-READY123"],
      email: authQuery.data?.email || undefined,
    },
    {
      staleTime: 10000,
    }
  );

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const clean = inputRef.trim();
    if (!clean) {
      toast.error("Please enter an order reference or tracking code.");
      return;
    }
    setActiveRef(clean);
    window.history.replaceState(null, "", `/orders?ref=${encodeURIComponent(clean)}`);
  };

  const handleSelectOrderForTracking = (ref: string) => {
    setInputRef(ref);
    setActiveRef(ref);
    window.history.replaceState(null, "", `/orders?ref=${encodeURIComponent(ref)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setActiveRef("");
    setInputRef("");
    window.history.replaceState(null, "", `/orders`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDeleteSavedOrder = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomerOrder(ref);
    setSavedRefs(prev => prev.filter(r => r !== ref));
    myOrdersQuery.refetch();
    toast.info(`Order ${ref} removed from local history.`);
  };

  const handleReorder = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        addItem(
          {
            id: item.productId || "terrace-piece",
            name: item.name,
            price: item.unitAmount || 785000,
            image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800",
            category: "Apparel",
            summary: "Archival piece reordered from past purchase.",
          } as any,
          item.color || "Standard",
          item.size || "M"
        );
      });
      toast.success(`${order.items.length} item${order.items.length > 1 ? "s" : ""} added back to Bag!`);
    }
  };

  // Filtered orders list by status tab
  const allOrders = myOrdersQuery.data || [];
  const filteredOrders = useMemo(() => {
    if (selectedTab === "all") return allOrders;
    if (selectedTab === "new") return allOrders.filter(o => o.status === "new");
    if (selectedTab === "packing") return allOrders.filter(o => o.status === "contacted" && o.currentStep === 3);
    if (selectedTab === "transit") return allOrders.filter(o => o.status === "closed" && o.currentStep === 4);
    if (selectedTab === "closed") return allOrders.filter(o => o.status === "closed");
    return allOrders;
  }, [allOrders, selectedTab]);

  const singleOrder = trackQuery.data;

  return (
    <PageEntrance>
      <div className="container" style={{ maxWidth: "880px", margin: "0 auto", padding: "40px 20px 100px" }}>
        {/* Top Action Bar (Properly Aligned) */}
        <div
          style={{
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {activeRef ? (
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <ArrowLeft size={14} /> Back to All Orders
            </button>
          ) : (
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--muted-foreground)",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} /> Back to Shop
            </Link>
          )}

          {!activeRef && (
            <button
              type="button"
              onClick={() => myOrdersQuery.refetch()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "4px 10px",
                color: "var(--muted-foreground)",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
              title="Refresh order list"
            >
              <RefreshCw size={12} className={myOrdersQuery.isFetching ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <p
            className="eyebrow"
            style={{
              letterSpacing: "0.15em",
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Client Services & Archive Dispatch
          </p>
          <h1 style={{ fontFamily: "serif", fontSize: "2.3rem", fontWeight: "normal", margin: "6px 0 10px" }}>
            {activeRef ? "Order & Transit Details" : "My Orders & Dispatch Tracking"}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.92rem", maxWidth: "540px", margin: "0 auto" }}>
            Review past archival purchases and track real-time garment curation, quality control, packaging, and courier transit.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "8px",
              maxWidth: "520px",
              margin: "24px auto 0",
              background: "var(--card)",
              padding: "6px",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", flex: 1, paddingLeft: "12px", gap: "8px" }}>
              <Search size={18} style={{ color: "var(--muted-foreground)" }} />
              <input
                type="text"
                value={inputRef}
                onChange={e => setInputRef(e.target.value)}
                placeholder="Search Order Ref, Waybill, or Paddle ID..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                }}
              />
            </div>
            <button
              type="submit"
              className="primary-button"
              style={{
                padding: "8px 18px",
                fontSize: "0.85rem",
                borderRadius: "2px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {trackQuery.isFetching ? <LoaderCircle className="animate-spin" size={15} /> : "Track"}
            </button>
          </form>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: SINGLE ORDER DETAILED TRACKING TIMELINE */}
        {/* ============================================================ */}
        {activeRef ? (
          <div>
            {trackQuery.isLoading && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <LoaderCircle className="animate-spin" size={32} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
                <p style={{ color: "var(--muted-foreground)" }}>Locating order {activeRef}...</p>
              </div>
            )}

            {trackQuery.isError && (
              <div
                style={{
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                  padding: "32px",
                  borderRadius: "4px",
                  textAlign: "center",
                  marginBottom: "40px",
                }}
              >
                <HelpCircle size={36} color="#ef4444" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#b91c1c", marginBottom: "8px" }}>
                  Order Reference Not Found
                </h3>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 20px" }}>
                  Reference code <strong>{activeRef}</strong> has not been found. Please check your invoice email or transaction confirmation.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrderForTracking("TR-READY123")}
                    className="secondary-button"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    View Demo Order (TR-READY123)
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="primary-button"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    Back to My Orders
                  </button>
                </div>
              </div>
            )}

            {singleOrder && (
              <FadeIn>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    borderRadius: "4px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  {/* Order Header Banner */}
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--muted)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Order Reference:
                        </span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            color: "var(--foreground)",
                          }}
                        >
                          {singleOrder.reference}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(singleOrder.reference, "Order reference")}
                          title="Copy reference code"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--muted-foreground)",
                            padding: "2px",
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                        Placed on: {new Date(singleOrder.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "100px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          backgroundColor: `${singleOrder.statusColor}18`,
                          color: singleOrder.statusColor,
                          border: `1px solid ${singleOrder.statusColor}33`,
                        }}
                      >
                        <CheckCircle2 size={15} /> {singleOrder.statusBadge}
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                        Estimated Delivery: <strong>{singleOrder.estimatedDelivery}</strong>
                      </p>
                    </div>
                  </div>

                  {/* 5-Step Progress Stepper */}
                  <div style={{ padding: "32px 24px", borderBottom: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "24px" }}>
                      Fulfillment & Transit Timeline
                    </h3>

                    <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: "16px" }}>
                      {/* Connecting Line */}
                      <div
                        style={{
                          position: "absolute",
                          top: "20px",
                          left: "24px",
                          right: "24px",
                          height: "3px",
                          backgroundColor: "var(--border)",
                          zIndex: 1,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            backgroundColor: "#16a34a",
                            width: `${Math.min(100, Math.max(0, ((singleOrder.currentStep - 1) / 4) * 100))}%`,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>

                      {/* Steps */}
                      {[
                        { title: "Placed", icon: Package, step: 1 },
                        { title: "Paid", icon: ShieldCheck, step: 2 },
                        { title: "In Packaging", icon: Boxes, step: 3 },
                        { title: "Dispatched", icon: Truck, step: 4 },
                        { title: "Delivered", icon: PackageCheck, step: 5 },
                      ].map(s => {
                        const isDone = singleOrder.currentStep >= s.step || (s.step === 5 && singleOrder.status === "closed");
                        const isCurrent = singleOrder.currentStep === s.step;

                        return (
                          <div
                            key={s.step}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              position: "relative",
                              zIndex: 2,
                              width: "70px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: isDone ? "#16a34a" : isCurrent ? "var(--primary)" : "var(--card)",
                                border: `2px solid ${isDone ? "#16a34a" : isCurrent ? "var(--primary)" : "var(--border)"}`,
                                color: isDone || isCurrent ? "#fff" : "var(--muted-foreground)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "8px",
                                transition: "all 0.3s ease",
                                boxShadow: isCurrent ? "0 0 0 4px rgba(62, 79, 59, 0.2)" : "none",
                              }}
                            >
                              <s.icon size={17} />
                            </div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: isCurrent ? 700 : 500,
                                color: isDone || isCurrent ? "var(--foreground)" : "var(--muted-foreground)",
                                lineHeight: 1.2,
                              }}
                            >
                              {s.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Status Alert Box */}
                    <div
                      style={{
                        marginTop: "24px",
                        padding: "14px 18px",
                        borderRadius: "4px",
                        backgroundColor: "var(--muted)",
                        borderLeft: `4px solid ${singleOrder.statusColor}`,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--foreground)", lineHeight: 1.5 }}>
                        <strong>Current Status:</strong> {singleOrder.statusDescription}
                      </p>
                    </div>
                  </div>

                  {/* Courier & Recipient Details */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "20px",
                      padding: "20px 24px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "rgba(0,0,0,0.01)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                        <Truck size={15} />
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                          Logistics & Courier
                        </span>
                      </div>
                      <p style={{ margin: "2px 0", fontWeight: 600, fontSize: "0.9rem" }}>{singleOrder.courierName}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 8px" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Waybill:</span>
                        <span style={{ fontFamily: "monospace", color: "var(--foreground)", fontWeight: 700, fontSize: "0.9rem" }}>
                          {singleOrder.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(singleOrder.trackingNumber);
                            toast.success("Waybill / Resi copied to clipboard!");
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "2px",
                            cursor: "pointer",
                            color: "var(--muted-foreground)",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          title="Copy Waybill No"
                        >
                          <Copy size={13} />
                        </button>
                      </div>

                      {singleOrder.trackingUrl && (
                        <a
                          href={singleOrder.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            padding: "5px 10px",
                            borderRadius: "3px",
                            backgroundColor: "var(--ink)",
                            color: "#ffffff",
                            textDecoration: "none",
                            marginTop: "4px",
                          }}
                        >
                          Track on Courier Website <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                        <User size={15} />
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                          Recipient & Contact
                        </span>
                      </div>
                      <p style={{ margin: "2px 0", fontWeight: 600, fontSize: "0.9rem" }}>{singleOrder.customerName}</p>
                      <p style={{ margin: "2px 0", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                        {singleOrder.email} · {singleOrder.phone}
                      </p>
                      {singleOrder.notes && (
                        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                          Notes: "{singleOrder.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ padding: "24px" }}>
                    <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: "16px" }}>
                      Purchased Pieces ({singleOrder.items.length})
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {singleOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingBottom: "14px",
                            borderBottom: idx === singleOrder.items.length - 1 ? "none" : "1px solid var(--border)",
                          }}
                        >
                          <div>
                            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{item.name}</h4>
                            <div style={{ display: "flex", gap: "10px", marginTop: "3px", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                              <span>Color: <strong>{item.color}</strong></span>
                              <span>Size: <strong>{item.size}</strong></span>
                              <span>Qty: <strong>{item.quantity}×</strong></span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{formatPrice(item.lineTotal)}</span>
                            {item.quantity > 1 && (
                              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                                @{formatPrice(item.unitAmount)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "14px",
                        borderTop: "1px dashed var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Total Paid</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--primary)" }}>
                        {formatPrice(singleOrder.subtotal)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      padding: "16px 24px",
                      backgroundColor: "var(--muted)",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="secondary-button"
                      style={{ fontSize: "0.85rem", padding: "8px 14px" }}
                    >
                      ← Back to All Orders
                    </button>

                    <a
                      href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Hello CFJ Concierge, I would like to inquire regarding order reference: ${singleOrder.reference}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-button"
                      style={{ fontSize: "0.85rem", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <MessageSquare size={14} /> Contact Concierge
                    </a>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW 2: MY ORDERS LIST (SHOPEE-STYLE TABS) */
          /* ============================================================ */
          <div>
            {/* Status Filter Tabs */}
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                borderBottom: "2px solid var(--border)",
                marginBottom: "24px",
                gap: "8px",
              }}
            >
              {[
                { id: "all", label: "All Orders", count: allOrders.length },
                { id: "new", label: "Awaiting / New", count: allOrders.filter(o => o.status === "new").length },
                { id: "packing", label: "In Packaging", count: allOrders.filter(o => o.status === "contacted" && o.currentStep === 3).length },
                { id: "transit", label: "In Transit", count: allOrders.filter(o => o.status === "closed" && o.currentStep === 4).length },
                { id: "closed", label: "Delivered", count: allOrders.filter(o => o.status === "closed").length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as OrderFilterTab)}
                  style={{
                    padding: "12px 18px",
                    fontSize: "0.88rem",
                    fontWeight: selectedTab === tab.id ? 700 : 500,
                    color: selectedTab === tab.id ? "var(--primary)" : "var(--muted-foreground)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    position: "relative",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 6px",
                        borderRadius: "100px",
                        backgroundColor: selectedTab === tab.id ? "var(--primary)" : "var(--muted)",
                        color: selectedTab === tab.id ? "var(--paper)" : "var(--muted-foreground)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                  {selectedTab === tab.id && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        left: 0,
                        right: 0,
                        height: "2px",
                        backgroundColor: "var(--primary)",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Loading */}
            {myOrdersQuery.isLoading && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <LoaderCircle className="animate-spin" size={32} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
                <p style={{ color: "var(--muted-foreground)" }}>Loading your purchase history...</p>
              </div>
            )}

            {/* Empty State */}
            {!myOrdersQuery.isLoading && filteredOrders.length === 0 && (
              <div
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "4px",
                  padding: "60px 20px",
                  textAlign: "center",
                  backgroundColor: "var(--card)",
                }}
              >
                <ShoppingBag size={40} strokeWidth={1.2} style={{ color: "var(--muted-foreground)", margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "6px" }}>No Orders in This Status</h3>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto 20px" }}>
                  You do not have any orders matching this category. Explore our archive collection to begin.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrderForTracking("TR-READY123")}
                    className="secondary-button"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    View Demo Order (TR-READY123)
                  </button>
                  <Link href="/shop" className="primary-button" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                    Explore Shop
                  </Link>
                </div>
              </div>
            )}

            {/* Orders List */}
            {!myOrdersQuery.isLoading && filteredOrders.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {filteredOrders.map(order => (
                  <div
                    key={order.reference}
                    onClick={() => handleSelectOrderForTracking(order.reference)}
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      borderRadius: "4px",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.03)";
                    }}
                  >
                    {/* Card Header */}
                    <div
                      style={{
                        padding: "14px 20px",
                        borderBottom: "1px solid var(--border)",
                        backgroundColor: "var(--muted)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Store size={15} style={{ color: "var(--primary)" }} />
                        <span style={{ fontWeight: 600 }}>CFJ Official Store</span>
                        <span style={{ color: "var(--muted-foreground)" }}>·</span>
                        <span style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>
                          #{order.reference}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "100px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            backgroundColor: `${order.statusColor}18`,
                            color: order.statusColor,
                          }}
                        >
                          <CheckCircle2 size={13} /> {order.statusBadge}
                        </span>
                      </div>
                    </div>

                    {/* Card Items */}
                    <div style={{ padding: "18px 20px" }}>
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingBottom: idx === order.items.length - 1 ? 0 : "12px",
                            marginBottom: idx === order.items.length - 1 ? 0 : "12px",
                            borderBottom: idx === order.items.length - 1 ? "none" : "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "4px",
                                backgroundColor: "var(--muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              <Package size={22} strokeWidth={1.5} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{item.name}</h4>
                              <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                <span>Variation: {item.color} · {item.size}</span>
                                <span>Qty: {item.quantity}×</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{formatPrice(item.lineTotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer */}
                    <div
                      style={{
                        padding: "14px 20px",
                        borderTop: "1px solid var(--border)",
                        backgroundColor: "rgba(0,0,0,0.01)",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Total ({order.items.length} item{order.items.length > 1 ? "s" : ""}): </span>
                        <strong style={{ fontSize: "1.05rem", color: "var(--primary)" }}>
                          {formatPrice(order.subtotal)}
                        </strong>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={e => handleDeleteSavedOrder(order.reference, e)}
                          title="Remove from local history"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--muted-foreground)",
                            cursor: "pointer",
                            padding: "6px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={e => handleReorder(order, e)}
                          className="secondary-button"
                          style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                        >
                          Buy Again
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectOrderForTracking(order.reference)}
                          className="primary-button"
                          style={{ fontSize: "0.8rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <Truck size={13} /> Track Package
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageEntrance>
  );
}
