import { useAuth } from "@/_core/hooks/useAuth";
import { PaginationControl } from "@/components/PaginationControl";
import { productCatalog } from "@/data/catalog";
import { downloadOrderCsv, downloadOrderReport } from "@/lib/adminExport";
import { parseRequestedPieces } from "@/lib/adminOrders";
import { formatTrendLabel, getDatePreset } from "@/lib/adminMonitoring";
import { formatPrice } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Flame,
  LoaderCircle,
  LogIn,
  LogOut,
  Minus,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Truck,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type FilterStatus = "all" | "new" | "contacted" | "closed";
type Order = {
  id: number;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  notes: string | null;
  items: string;
  subtotal: number;
  currency: string;
  status: Exclude<FilterStatus, "all">;
  fulfillmentStage?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: Date | string;
};

const COURIER_PRESETS = [
  { name: "JNE Express", url: "https://www.jne.co.id/tracking" },
  { name: "SiCepat Express", url: "https://sicepat.com/checkAwb" },
  { name: "J&T Express", url: "https://jet.co.id/track" },
  { name: "DHL Express", url: "https://www.dhl.com/en/express/tracking.html" },
  { name: "FedEx", url: "https://www.fedex.com/fedextrack/" },
  { name: "Lion Parcel", url: "https://lionparcel.com/track" },
  { name: "Anteraja", url: "https://anteraja.id/tracking" },
  { name: "POS Indonesia", url: "https://www.posindonesia.co.id/en/tracking" },
  { name: "Custom Courier", url: "" },
];

function OrderShippingSection({
  order,
  onSave,
  isPending,
  disabled,
}: {
  order: Order;
  onSave: (payload: {
    id: number;
    status: Exclude<FilterStatus, "all">;
    fulfillmentStage?: string;
    courierName: string;
    trackingNumber: string;
    trackingUrl: string;
  }) => void;
  isPending: boolean;
  disabled: boolean;
}) {
  const [courier, setCourier] = useState(order.courierName || "JNE Express");
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber || `TRC-${order.reference.replace(/^TR-/, "")}-ID`
  );
  const [trackingUrl, setTrackingUrl] = useState(
    order.trackingUrl || "https://www.jne.co.id/tracking"
  );
  const [status, setStatus] = useState<Exclude<FilterStatus, "all">>(order.status || "new");
  const [fulfillmentStage, setFulfillmentStage] = useState(
    order.fulfillmentStage || (order.status === "closed" ? "dispatched" : order.status === "contacted" ? "in_packaging" : "placed")
  );

  useEffect(() => {
    setCourier(order.courierName || "JNE Express");
    setTrackingNumber(order.trackingNumber || `TRC-${order.reference.replace(/^TR-/, "")}-ID`);
    setTrackingUrl(order.trackingUrl || "https://www.jne.co.id/tracking");
    setStatus(order.status || "new");
    setFulfillmentStage(order.fulfillmentStage || (order.status === "closed" ? "dispatched" : order.status === "contacted" ? "in_packaging" : "placed"));
  }, [order.id, order.status, order.courierName, order.trackingNumber, order.trackingUrl, order.fulfillmentStage]);

  const handleCourierSelect = (presetCourier: string, defaultUrl: string) => {
    setCourier(presetCourier);
    if (defaultUrl) {
      setTrackingUrl(defaultUrl);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: order.id,
      status,
      fulfillmentStage,
      courierName: courier.trim(),
      trackingNumber: trackingNumber.trim(),
      trackingUrl: trackingUrl.trim(),
    });
  };

  return (
    <form onSubmit={handleSave} style={{ marginTop: "18px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
      <p className="detail-label" style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px" }}>
        <Truck size={13} /> Shipping, Resi & Fulfillment
      </p>

      {/* Fulfillment / Status */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        <label style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#60625d" }}>
          Fulfillment Stage / Status
        </label>
        <select
          aria-label="Request status"
          value={fulfillmentStage}
          disabled={disabled || isPending}
          onChange={(e) => {
            const stage = e.target.value;
            setFulfillmentStage(stage);
            let newStatus: Exclude<FilterStatus, "all"> = status;
            if (stage === "dispatched" || stage === "delivered" || stage === "closed") {
              newStatus = "closed";
            } else if (stage === "in_packaging" || stage === "contacted") {
              newStatus = "contacted";
            } else if (stage === "placed" || stage === "new") {
              newStatus = "new";
            }
            setStatus(newStatus);
            onSave({
              id: order.id,
              status: newStatus,
              fulfillmentStage: stage,
              courierName: courier.trim(),
              trackingNumber: trackingNumber.trim(),
              trackingUrl: trackingUrl.trim(),
            });
          }}
          style={{
            background: "var(--fog)",
            border: "1px solid var(--chalk)",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 600,
            borderRadius: "2px",
            color: "var(--ink)",
          }}
        >
          <option value="new">1. Placed & Verified (Status: New)</option>
          <option value="contacted">2. In Packaging & QC (Status: Contacted)</option>
          <option value="dispatched">3. Dispatched / In Transit (Status: Closed - Resi Active)</option>
          <option value="delivered">4. Delivered to Recipient (Status: Closed)</option>
        </select>
      </div>

      {/* Courier Select */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        <label style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#60625d" }}>
          Courier / Ekspedisi
        </label>
        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={COURIER_PRESETS.some(p => p.name === courier) ? courier : "custom"}
            disabled={disabled || isPending}
            onChange={(e) => {
              const val = e.target.value;
              if (val !== "custom") {
                const found = COURIER_PRESETS.find(p => p.name === val);
                if (found) handleCourierSelect(found.name, found.url);
              }
            }}
            style={{
              background: "var(--fog)",
              border: "1px solid var(--chalk)",
              padding: "8px 10px",
              fontSize: "11px",
              borderRadius: "2px",
              flex: 1,
              color: "var(--ink)",
            }}
          >
            {COURIER_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
            <option value="custom">Other / Custom Courier...</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Courier Name (e.g. JNE YES, SiCepat BEST)"
          value={courier}
          disabled={disabled || isPending}
          onChange={(e) => setCourier(e.target.value)}
          style={{
            background: "var(--fog)",
            border: "1px solid var(--chalk)",
            padding: "8px 10px",
            fontSize: "11px",
            borderRadius: "2px",
            color: "var(--ink)",
          }}
        />
      </div>

      {/* Tracking Number / Nomor Resi */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#60625d" }}>
            Waybill No / Nomor Resi
          </label>
          <button
            type="button"
            onClick={() => setTrackingNumber(`TRC-${Math.floor(100000000 + Math.random() * 900000000)}`)}
            style={{
              background: "none",
              border: "none",
              fontSize: "9px",
              fontWeight: 700,
              textDecoration: "underline",
              color: "var(--primary)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Generate Resi
          </button>
        </div>
        <input
          type="text"
          placeholder="Enter tracking / waybill number (e.g. JP8912839210)"
          value={trackingNumber}
          disabled={disabled || isPending}
          onChange={(e) => setTrackingNumber(e.target.value)}
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            background: "var(--fog)",
            border: "1px solid var(--chalk)",
            padding: "8px 10px",
            fontSize: "12px",
            borderRadius: "2px",
            color: "var(--ink)",
          }}
        />
      </div>

      {/* Tracking Website URL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#60625d" }}>
            Tracking Website URL (Link Cek Resi)
          </label>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "9px",
                fontWeight: 700,
                textDecoration: "underline",
                color: "var(--primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              Test Link <ExternalLink size={10} />
            </a>
          )}
        </div>
        <input
          type="url"
          placeholder="https://sicepat.com/checkAwb or tracking link"
          value={trackingUrl}
          disabled={disabled || isPending}
          onChange={(e) => setTrackingUrl(e.target.value)}
          style={{
            background: "var(--fog)",
            border: "1px solid var(--chalk)",
            padding: "8px 10px",
            fontSize: "11px",
            borderRadius: "2px",
            color: "var(--ink)",
          }}
        />
      </div>

      {/* Save Dispatch Details Button */}
      <button
        type="submit"
        disabled={disabled || isPending}
        style={{
          width: "100%",
          padding: "10px 14px",
          backgroundColor: "var(--ink)",
          color: "#ffffff",
          border: "none",
          borderRadius: "2px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: isPending ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {isPending ? <LoaderCircle size={14} className="button-spinner" /> : <Save size={14} />}
        {isPending ? "Saving Dispatch..." : "Save Dispatch & Resi"}
      </button>
    </form>
  );
}
type Summary = Record<
  Exclude<FilterStatus, "all">,
  { count: number; amount: number; change: number | null }
> & { comparisonLabel: string };
type ProductPopularity = {
  productId: string;
  name: string;
  requestedQuantity: number;
  requestCount: number;
};

const PAGE_SIZE = 10;
const statusLabels: Record<Exclude<FilterStatus, "all">, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};
const previewOrder: Order = {
  id: 0,
  reference: "TR-PREVIEW01",
  customerName: "Nadia Pratama",
  email: "nadia@example.com",
  phone: "+628123456789",
  notes: "Please contact after 5pm.",
  items:
    '[{"productId":"junction-ls","name":"Junction Long Sleeve","quantity":1,"color":"Ink","size":"M","unitAmount":1888000,"lineTotal":1888000}]',
  subtotal: 1888000,
  currency: "IDR",
  status: "new",
  createdAt: new Date("2026-08-25"),
};

function TrendChart({ data }: { data: Array<{ day: string; total: number }> }) {
  return (
    <section className="trend-card" aria-label="Daily order request trend">
      <div className="trend-card-head">
        <div>
          <p className="eyebrow">Request trend</p>
          <h2>Daily submissions</h2>
        </div>
        <span>{data.reduce((total, point) => total + point.total, 0)} submissions</span>
      </div>
      {data.length ? (
        <div className="trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="requestTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3e4f3b" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#3e4f3b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tickFormatter={formatTrendLabel}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#62645f", fontSize: 10 }}
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#62645f", fontSize: 10 }}
              />
              <Tooltip
                labelFormatter={formatTrendLabel}
                formatter={(value: number) => [`${value} requests`, "Submitted"]}
                contentStyle={{ border: "1px solid rgba(21,23,26,.17)", borderRadius: 0, fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3e4f3b"
                strokeWidth={2}
                fill="url(#requestTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="trend-empty">No submissions for this scope.</div>
      )}
    </section>
  );
}

function ChangeIndicator({ change, label }: { change: number | null; label: string }) {
  if (change === null)
    return (
      <small className="summary-change neutral">
        <Minus size={11} /> New in scope
      </small>
    );
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <small className={`summary-change ${change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}`}>
      <Icon size={11} /> {change > 0 ? "+" : ""}
      {change}% vs {label}
    </small>
  );
}

function PopularityPanel({ products }: { products: ProductPopularity[] }) {
  return (
    <section className="popularity-card" aria-label="Top requested products">
      <div className="popularity-card-head">
        <div>
          <p className="eyebrow">Demand signal</p>
          <h2>Top requested pieces</h2>
        </div>
        <Trophy size={19} strokeWidth={1.4} />
      </div>
      {products.length ? (
        <ol className="popularity-list">
          {products.map((product, index) => (
            <li key={product.productId}>
              <span className="popularity-rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="popularity-name">
                <strong>{product.name}</strong>
                <small>
                  {product.requestCount} {product.requestCount === 1 ? "request" : "requests"}
                </small>
              </span>
              <b>{product.requestedQuantity}×</b>
            </li>
          ))}
        </ol>
      ) : (
        <div className="popularity-empty">No requested pieces match this view.</div>
      )}
      <p className="popularity-note">Ranked by requested quantity in order requests.</p>
    </section>
  );
}

function AddToBagTelemetryPanel() {
  const analyticsQuery = trpc.analytics.getStats.useQuery();
  const stats = analyticsQuery.data;

  return (
    <section className="analytics-telemetry-card" aria-label="Add to bag real-time tracking">
      <div className="analytics-telemetry-head">
        <div>
          <p className="eyebrow">Real-Time Intent Tracking</p>
          <h2>Add-to-Bag Telemetry</h2>
        </div>
        <div className="telemetry-badges">
          <span className="telemetry-stat-badge">
            <Flame size={13} /> Today: <strong>{stats?.todayAddToBag || 0}</strong>
          </span>
          <span className="telemetry-stat-badge">
            <ShoppingBag size={13} /> Total: <strong>{stats?.totalAddToBag || 0}</strong>
          </span>
        </div>
      </div>

      {stats?.topProducts && stats.topProducts.length > 0 ? (
        <div className="telemetry-leaderboard">
          <p className="telemetry-lead-title">Most Added Pieces to Bag</p>
          <div className="telemetry-bars">
            {stats.topProducts.map((p, idx) => {
              const maxCount = Math.max(...stats.topProducts.map(x => x.count), 1);
              const pct = Math.round((p.count / maxCount) * 100);
              return (
                <div className="telemetry-bar-row" key={p.productId || idx}>
                  <div className="telemetry-bar-meta">
                    <strong>{p.productName}</strong>
                    <span>{p.count} adds</span>
                  </div>
                  <div className="telemetry-bar-track">
                    <div className="telemetry-bar-fill" style={{ width: `${Math.max(pct, 6)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="telemetry-empty">
          <ShoppingBag size={24} strokeWidth={1.25} />
          <p>Add-to-bag events will stream here live as visitors explore the collection.</p>
        </div>
      )}
    </section>
  );
}

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const initialRange = useMemo(() => getDatePreset("last30"), []);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 15>(10);
  const [selected, setSelected] = useState<Order | null>(() =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("detail") === "1"
      ? previewOrder
      : null
  );
  const isPreview =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "order";

  const input = useMemo(
    () => ({
      status: overdueOnly ? ("new" as const) : filter === "all" ? undefined : filter,
      overdueOnly,
      search: deferredSearch || undefined,
      productId: productId || undefined,
      startDate,
      endDate,
      page,
      pageSize,
    }),
    [filter, overdueOnly, deferredSearch, productId, startDate, endDate, page, pageSize]
  );
  const exportInput = useMemo(
    () => ({
      status: overdueOnly ? ("new" as const) : filter === "all" ? undefined : filter,
      overdueOnly,
      search: deferredSearch || undefined,
      productId: productId || undefined,
      startDate,
      endDate,
    }),
    [filter, overdueOnly, deferredSearch, productId, startDate, endDate]
  );
  const query = trpc.adminOrders.list.useQuery(input, {
    enabled: Boolean(isAuthenticated && user?.role === "admin") && !isPreview,
  });
  const exportQuery = trpc.adminOrders.exportRows.useQuery(exportInput, { enabled: false });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed out successfully");
      setLocation("/admin/login");
    },
  });

  const update = trpc.adminOrders.updateStatus.useMutation({
    onSuccess: order => {
      setSelected(order);
      utils.adminOrders.list.invalidate();
      utils.adminOrders.exportRows.invalidate();
      toast.success("Order status updated.");
    },
    onError: error => toast.error(error.message),
  });

  const resetPageAndSelection = () => {
    setPage(1);
    setSelected(null);
  };
  const selectStatus = (status: FilterStatus) => {
    setOverdueOnly(false);
    setFilter(status);
    resetPageAndSelection();
  };
  const toggleOverdue = () => {
    setOverdueOnly(current => !current);
    setFilter("new");
    resetPageAndSelection();
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    resetPageAndSelection();
  };
  const changeProduct = (value: string) => {
    setProductId(value);
    resetPageAndSelection();
  };
  const changeDate = (type: "start" | "end", value: string) => {
    if (type === "start") setStartDate(value);
    else setEndDate(value);
    resetPageAndSelection();
  };
  const applyPreset = (preset: "last7" | "month") => {
    const values = getDatePreset(preset);
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    resetPageAndSelection();
  };
  const exportReport = async (format: "xlsx" | "csv") => {
    try {
      const result = await exportQuery.refetch();
      if (!result.data?.length) {
        toast.error("No matching requests to export.");
        return;
      }
      if (format === "xlsx") await downloadOrderReport(result.data);
      else downloadOrderCsv(result.data);
      toast.success(`${format.toUpperCase()} report downloaded.`);
    } catch {
      toast.error("The report could not be exported.");
    }
  };

  if (loading && !isPreview) {
    return (
      <main className="admin-gate">
        <LoaderCircle className="button-spinner" />
        <p>Checking access…</p>
      </main>
    );
  }

  if (!isAuthenticated && !isPreview) {
    return (
      <main className="admin-gate">
        <ClipboardList size={32} strokeWidth={1.2} />
        <p className="eyebrow">CFJ administration</p>
        <h1>Sign in to manage requests.</h1>
        <p>This area is restricted to store administrators.</p>
        <Link href="/admin/login" className="primary-button">
          <LogIn size={16} /> Enter Staff Login
        </Link>
      </main>
    );
  }

  if (user?.role !== "admin" && !isPreview) {
    return (
      <main className="admin-gate">
        <PackageOpen size={32} strokeWidth={1.2} />
        <p className="eyebrow">Access restricted</p>
        <h1>Your account does not manage orders.</h1>
        <Link href="/" className="primary-button">
          Return to storefront
        </Link>
      </main>
    );
  }

  const result = isPreview
    ? {
        orders: [previewOrder],
        total: 1,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
        summary: {
          new: { count: 1, amount: 1888000, change: 25 },
          contacted: { count: 0, amount: 0, change: 0 },
          closed: { count: 0, amount: 0, change: -100 },
          comparisonLabel: "previous 30 days",
        },
        trend: [{ day: "2026-08-25", total: 1 }],
        overdueCount: 1,
        topProducts: [
          { productId: "junction-ls", name: "Junction Long Sleeve", requestedQuantity: 1, requestCount: 1 },
        ],
      }
    : query.data;

  const orders = result?.orders ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const summary: Summary = result?.summary ?? {
    new: { count: 0, amount: 0, change: 0 },
    contacted: { count: 0, amount: 0, change: 0 },
    closed: { count: 0, amount: 0, change: 0 },
    comparisonLabel: "previous period",
  };
  const trend = result?.trend ?? [];
  const topProducts = result?.topProducts ?? [];
  const overdueCount = result?.overdueCount ?? 0;

  const content =
    query.isLoading && !isPreview ? (
      <div className="admin-loading">
        <LoaderCircle className="button-spinner" /> Loading requests…
      </div>
    ) : query.isError && !isPreview ? (
      <div className="admin-empty">
        <RefreshCw size={30} strokeWidth={1.2} />
        <h2>Requests could not be loaded.</h2>
        <p>Check your connection, then try loading this page again.</p>
        <button className="primary-button" onClick={() => query.refetch()}>
          Try again
        </button>
      </div>
    ) : !orders.length ? (
      <div className="admin-empty">
        <ClipboardList size={30} strokeWidth={1.2} />
        <h2>{overdueOnly ? "No overdue follow-ups." : "No requests here yet."}</h2>
        <p>
          {overdueOnly
            ? "Every New request has either been contacted or is still within its first 24 hours."
            : "Try another customer name, request reference, product type, or date range."}
        </p>
      </div>
    ) : (
      <>
        <div className="admin-grid">
          <section className="order-table" aria-label="Order requests">
            <div className="order-table-head" aria-hidden="true">
              <span>Reference</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Date</span>
              <span style={{ textAlign: "right", paddingRight: "10px" }}>Actions</span>
            </div>
            {orders.map(order => (
              <article
                className={`order-row ${selected?.id === order.id ? "selected" : ""}`}
                key={order.id}
              >
                <button
                  className="order-row-main"
                  onClick={() => setSelected(order)}
                  aria-label={`View ${order.reference}`}
                >
                  <span className="order-reference">{order.reference}</span>
                  <span className="order-customer">
                    <strong>{order.customerName}</strong>
                    <small>{order.email}</small>
                  </span>
                  <span className={`status-badge ${order.status}`}>{statusLabels[order.status]}</span>
                  <strong className="order-amount">{formatPrice(order.subtotal)}</strong>
                  <time>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </button>
                <div className="row-quick-actions">
                  {order.status === "new" ? (
                    <>
                      <button
                        disabled={update.isPending || isPreview}
                        onClick={(e) => {
                          e.stopPropagation();
                          update.mutate({ id: order.id, status: "contacted" });
                        }}
                        aria-label={`Mark ${order.reference} as Contacted`}
                      >
                        Contact
                      </button>
                      <button
                        disabled={update.isPending || isPreview}
                        onClick={(e) => {
                          e.stopPropagation();
                          update.mutate({ id: order.id, status: "closed" });
                        }}
                        aria-label={`Mark ${order.reference} as Closed`}
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(order);
                      }}
                      style={{ opacity: 0.7, fontSize: "9px" }}
                    >
                      {selected?.id === order.id ? "Viewing" : "View"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>

          <aside className="order-detail" aria-live="polite">
            {selected ? (
              <>
                <div className="detail-title">
                  <div>
                    <p className="eyebrow">{selected.reference}</p>
                    <h2>{selected.customerName}</h2>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Close order detail"
                    onClick={() => setSelected(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="detail-contact">
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  <a href={`tel:${selected.phone}`}>
                    <Phone size={13} /> {selected.phone}
                  </a>
                  <a
                    href={`/track?ref=${encodeURIComponent(selected.reference)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--primary)",
                      fontWeight: 600,
                      textDecoration: "underline",
                      fontSize: "0.85rem",
                    }}
                  >
                    Live Customer Tracking <ExternalLink size={12} />
                  </a>
                </div>
                <div className="detail-section">
                  <p className="detail-label">Requested pieces</p>
                  {parseRequestedPieces(selected.items).map(piece => (
                    <div
                      className="requested-piece"
                      key={`${piece.productId}-${piece.color}-${piece.size}`}
                    >
                      <span>
                        <strong>
                          {piece.quantity}× {piece.name}
                        </strong>
                        <small>
                          {piece.color} · {piece.size}
                        </small>
                      </span>
                      <b>{formatPrice(piece.lineTotal)}</b>
                    </div>
                  ))}
                  <div className="detail-total">
                    <span>Requested total</span>
                    <strong>{formatPrice(selected.subtotal)}</strong>
                  </div>
                </div>
                {selected.notes && (
                  <div className="detail-section">
                    <p className="detail-label">Customer note</p>
                    <p className="customer-note">{selected.notes}</p>
                  </div>
                )}

                <OrderShippingSection
                  order={selected}
                  isPending={update.isPending}
                  disabled={isPreview}
                  onSave={(payload) => {
                    update.mutate(payload);
                  }}
                />
              </>
            ) : (
              <div className="detail-placeholder">
                <PackageOpen size={29} strokeWidth={1.2} />
                <p>Select a request to view its customer details and pieces.</p>
              </div>
            )}
          </aside>
        </div>

        <nav className="pagination-section" aria-label="Order request pages">
          <PaginationControl
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(newPage) => {
              setPage(newPage);
              setSelected(null);
            }}
          />

          <div className="pagination-summary">
            <span>
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} requests
            </span>
            <div className="page-size-selector">
              <span>Per page:</span>
              <button
                type="button"
                className={pageSize === 10 ? "active" : ""}
                onClick={() => {
                  setPageSize(10);
                  setPage(1);
                  setSelected(null);
                }}
              >
                10
              </button>
              <button
                type="button"
                className={pageSize === 15 ? "active" : ""}
                onClick={() => {
                  setPageSize(15);
                  setPage(1);
                  setSelected(null);
                }}
              >
                15
              </button>
            </div>
          </div>
        </nav>
      </>
    );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">CFJ / Administration</p>
          <h1>Order requests</h1>
          <p>
            Review incoming requests, keep their status current, and follow up directly with each customer.
          </p>
        </div>

        <div className="admin-nav-actions">
          <Link href="/admin/orders" className="admin-nav-tab active">
            Order Requests
          </Link>
          <Link href="/admin/catalog" className="admin-nav-tab">
            Catalog (CMS)
          </Link>
          <Link href="/" className="admin-store-link">
            Storefront <ExternalLink size={12} />
          </Link>
          <button
            className="admin-logout-btn"
            onClick={() => logoutMutation.mutate()}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <section className="status-summary" aria-label="Request status summary">
        {(["new", "contacted", "closed"] as const).map(status => (
          <div key={status} className={status}>
            <span>{statusLabels[status]}</span>
            <strong>{summary[status].count}</strong>
            <small>{formatPrice(summary[status].amount)} requested value</small>
            <ChangeIndicator change={summary[status].change} label={summary.comparisonLabel} />
          </div>
        ))}
        <button
          className={`follow-up-summary ${overdueOnly ? "active" : ""}`}
          onClick={toggleOverdue}
          aria-pressed={overdueOnly}
        >
          <span>
            <AlertTriangle size={14} /> Needs follow-up
          </span>
          <strong>{overdueCount}</strong>
          <small>New requests waiting 24h+</small>
        </button>
      </section>

      {/* Analytics & Telemetry Grid */}
      <div className="admin-insight-grid">
        <TrendChart data={trend} />
        <PopularityPanel products={topProducts} />
      </div>

      {/* Real-time Add to Bag Telemetry Card */}
      <AddToBagTelemetryPanel />

      <div className="admin-querybar">
        <label className="admin-search">
          <Search size={16} />
          <span className="sr-only">Search requests</span>
          <input
            value={search}
            onChange={event => changeSearch(event.target.value)}
            placeholder="Search customer name or request number"
          />
        </label>

        <label className="product-filter">
          <span>Product type</span>
          <select
            aria-label="Product type"
            value={productId}
            onChange={event => changeProduct(event.target.value)}
          >
            <option value="">All pieces</option>
            {productCatalog.map(product => (
              <option value={product.id} key={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <div className="date-range">
          <CalendarDays size={15} />
          <div className="date-presets">
            <button onClick={() => applyPreset("last7")}>Last 7 days</button>
            <button onClick={() => applyPreset("month")}>This month</button>
          </div>
          <label>
            From
            <input
              aria-label="Start date"
              type="date"
              value={startDate}
              max={endDate}
              onChange={event => changeDate("start", event.target.value)}
            />
          </label>
          <label>
            To
            <input
              aria-label="End date"
              type="date"
              value={endDate}
              min={startDate}
              onChange={event => changeDate("end", event.target.value)}
            />
          </label>
        </div>

        <div className="export-actions">
          <button
            className="admin-export"
            onClick={() => exportReport("xlsx")}
            disabled={exportQuery.isFetching || !total}
          >
            <FileSpreadsheet size={15} />
            {exportQuery.isFetching ? "Preparing…" : "Export XLSX"}
          </button>
          <button
            className="admin-export secondary"
            onClick={() => exportReport("csv")}
            disabled={exportQuery.isFetching || !total}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="status-filters">
          {(["all", "new", "contacted", "closed"] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => selectStatus(status)}
              className={!overdueOnly && filter === status ? "active" : ""}
            >
              {status === "all" ? "All requests" : statusLabels[status]}
            </button>
          ))}
          <button
            className={`follow-up-filter ${overdueOnly ? "active" : ""}`}
            onClick={toggleOverdue}
            aria-pressed={overdueOnly}
          >
            <AlertTriangle size={13} /> Needs follow-up
          </button>
        </div>
        <span>
          {total} {total === 1 ? "request" : "requests"}
          {overdueOnly ? " · 24h+ uncontacted" : ""}
        </span>
      </div>

      {content}
    </main>
  );
}

