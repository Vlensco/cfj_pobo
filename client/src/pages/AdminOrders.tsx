import { useAuth } from "@/_core/hooks/useAuth";
import "@/components/admin/admin-orders.css";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
import {
  AddToBagTelemetryPanel,
  ChangeIndicator,
  PopularityPanel,
  TrendChart,
} from "@/components/admin/OrderInsights";
import { PaginationControl } from "@/components/PaginationControl";
import { productCatalog } from "@/data/catalog";
import { downloadOrderCsv, downloadOrderReport } from "@/lib/adminExport";
import { AdminOrder, ORDER_STATUS_LABELS, OrderRequestStatus } from "@/lib/adminOrders";
import { getDatePreset } from "@/lib/adminMonitoring";
import { formatPrice } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { orderRequestStatuses } from "@shared/orderRequests";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  LogIn,
  PackageOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type FilterStatus = "all" | OrderRequestStatus;
type PageSize = (typeof PAGE_SIZES)[number];

const PAGE_SIZES = [10, 15] as const;
const STATUS_FILTERS: FilterStatus[] = ["all", ...orderRequestStatuses];

const EMPTY_SUMMARY = {
  new: { count: 0, amount: 0, change: 0 as number | null },
  contacted: { count: 0, amount: 0, change: 0 as number | null },
  closed: { count: 0, amount: 0, change: 0 as number | null },
  comparisonLabel: "previous period",
};

// ---- Development-only preview (?preview=order / ?detail=1) -------------------
const previewOrder: AdminOrder = {
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
const previewResult = {
  orders: [previewOrder],
  total: 1,
  totalPages: 1,
  summary: {
    new: { count: 1, amount: 1888000, change: 25 },
    contacted: { count: 0, amount: 0, change: 0 },
    closed: { count: 0, amount: 0, change: -100 },
    comparisonLabel: "previous 30 days",
  },
  trend: [{ day: "2026-08-25", total: 1 }],
  overdueCount: 1,
  topProducts: [{ productId: "junction-ls", name: "Junction Long Sleeve", requestedQuantity: 1, requestCount: 1 }],
};
const hasDevFlag = (name: string, value: string) =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get(name) === value;

const formatOrderDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminOrders() {
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
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<AdminOrder | null>(() => (hasDevFlag("detail", "1") ? previewOrder : null));
  const isPreview = hasDevFlag("preview", "order");
  const isAdmin = user?.role === "admin";

  const scope = useMemo(
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
  const listInput = useMemo(() => ({ ...scope, page, pageSize }), [scope, page, pageSize]);

  const query = trpc.adminOrders.list.useQuery(listInput, { enabled: isAuthenticated && isAdmin && !isPreview });
  const exportQuery = trpc.adminOrders.exportRows.useQuery(scope, { enabled: false });
  const utils = trpc.useUtils();

  const update = trpc.adminOrders.updateStatus.useMutation({
    onSuccess: order => {
      setSelected(order);
      utils.adminOrders.list.invalidate();
      utils.adminOrders.exportRows.invalidate();
      toast.success("Order status updated.");
    },
    onError: error => toast.error(error.message),
  });

  /** Any change to the list scope returns to the first page and closes the detail panel. */
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
    const range = getDatePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    resetPageAndSelection();
  };
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setSelected(null);
  };
  const changePageSize = (size: PageSize) => {
    setPageSize(size);
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

  if (!isPreview) {
    if (loading) {
      return (
        <main className="admin-gate">
          <LoaderCircle className="button-spinner" />
          <p>Checking access…</p>
        </main>
      );
    }

    if (!isAuthenticated) {
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

    if (!isAdmin) {
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
  }

  const result = isPreview ? previewResult : query.data;
  const orders: AdminOrder[] = result?.orders ?? [];
  const total = result?.total ?? 0;
  const summary = result?.summary ?? EMPTY_SUMMARY;
  const overdueCount = result?.overdueCount ?? 0;
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const renderRequests = () => {
    if (query.isLoading && !isPreview) {
      return (
        <div className="admin-loading">
          <LoaderCircle className="button-spinner" /> Loading requests…
        </div>
      );
    }

    if (query.isError && !isPreview) {
      return (
        <div className="admin-empty">
          <RefreshCw size={30} strokeWidth={1.2} />
          <h2>Requests could not be loaded.</h2>
          <p>Check your connection, then try loading this page again.</p>
          <button className="primary-button" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      );
    }

    if (!orders.length) {
      return (
        <div className="admin-empty">
          <ClipboardList size={30} strokeWidth={1.2} />
          <h2>{overdueOnly ? "No overdue follow-ups." : "No requests here yet."}</h2>
          <p>
            {overdueOnly
              ? "Every New request has either been contacted or is still within its first 24 hours."
              : "Try another customer name, request reference, product type, or date range."}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="admin-grid">
          <section className="order-table" aria-label="Order requests">
            <div className="order-table-head" aria-hidden="true">
              <span>Reference</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Date</span>
              <span className="order-table-actions">Actions</span>
            </div>
            {orders.map(order => {
              const isSelected = selected?.id === order.id;
              return (
                <article className={`order-row ${isSelected ? "selected" : ""}`} key={order.id}>
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
                    <span className={`status-badge ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                    <strong className="order-amount">{formatPrice(order.subtotal)}</strong>
                    <time>{formatOrderDate(order.createdAt)}</time>
                  </button>
                  <div className="row-quick-actions">
                    {order.status === "new" ? (
                      <>
                        <button
                          disabled={update.isPending || isPreview}
                          onClick={() => update.mutate({ id: order.id, status: "contacted" })}
                          aria-label={`Mark ${order.reference} as Contacted`}
                        >
                          Contact
                        </button>
                        <button
                          disabled={update.isPending || isPreview}
                          onClick={() => update.mutate({ id: order.id, status: "closed" })}
                          aria-label={`Mark ${order.reference} as Closed`}
                        >
                          Close
                        </button>
                      </>
                    ) : (
                      <button className="row-view-button" onClick={() => setSelected(order)}>
                        {isSelected ? "Viewing" : "View"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <OrderDetailPanel
            order={selected}
            isSaving={update.isPending}
            readOnly={isPreview}
            onClose={() => setSelected(null)}
            onSave={shipping => update.mutate(shipping)}
          />
        </div>

        <nav className="pagination-section" aria-label="Order request pages">
          <PaginationControl currentPage={page} totalPages={result?.totalPages ?? 1} onPageChange={changePage} />

          <div className="pagination-summary">
            <span>
              Showing {firstShown}–{Math.min(page * pageSize, total)} of {total} requests
            </span>
            <div className="page-size-selector">
              <span>Per page:</span>
              {PAGE_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  className={pageSize === size ? "active" : ""}
                  onClick={() => changePageSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </>
    );
  };

  return (
    <main className="admin-page">
      <AdminHeader
        active="orders"
        eyebrow="CFJ / Administration"
        title="Order requests"
        description="Review incoming requests, keep their status current, and follow up directly with each customer."
      />

      <section className="status-summary" aria-label="Request status summary">
        {orderRequestStatuses.map(status => (
          <div key={status} className={status}>
            <span>{ORDER_STATUS_LABELS[status]}</span>
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

      <div className="admin-insight-grid">
        <TrendChart data={result?.trend ?? []} />
        <PopularityPanel products={result?.topProducts ?? []} />
      </div>

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
          <select aria-label="Product type" value={productId} onChange={event => changeProduct(event.target.value)}>
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
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => selectStatus(status)}
              className={!overdueOnly && filter === status ? "active" : ""}
            >
              {status === "all" ? "All requests" : ORDER_STATUS_LABELS[status]}
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

      {renderRequests()}
    </main>
  );
}
