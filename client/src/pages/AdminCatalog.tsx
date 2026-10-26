import "@/components/admin/admin-catalog.css";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductFormModal, type ProductFormData } from "@/components/admin/ProductFormModal";
import { PageEntrance } from "@/components/MotionReveal";
import { PaginationControl } from "@/components/PaginationControl";
import { toIdrPrice } from "@/data/catalog";
import { formatPrice } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { parseProductCustomizationMeta, serializeProductCustomizationMeta } from "@shared/customization";
import { Boxes, Edit, Eye, EyeOff, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type PageSize = (typeof PAGE_SIZES)[number];
type ModalState = { mode: "create" } | { mode: "edit"; product: ProductFormData } | null;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type ProductState = "active" | "draft" | "archived" | "suspended";

interface AdminProductItem {
  handle: string;
  title: string;
  bodyHtml?: string | null;
  type?: string | null;
  tags?: string | null;
  published?: string | boolean | null;
  status?: string | null;
  primaryVariant?: { price?: string | number | null } | null;
  primaryImage?: { src?: string | null } | null;
}

const PAGE_SIZES = [10, 15] as const;
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;
const STATE_LABELS: Record<ProductState, { label: string; hint: string }> = {
  active: { label: "Active", hint: "Visible to customers" },
  draft: { label: "Draft", hint: "Hidden from customers" },
  archived: { label: "Archived", hint: "Hidden from customers" },
  suspended: { label: "Suspended", hint: "Hidden from customers" },
};
const FALLBACK_IMAGE = "/manus-storage/terrace-junction-v2_75e8572e.jpg";
const DEFAULT_NAMESET_PRICE = 75000;

const NEW_PRODUCT: ProductFormData = {
  handle: "",
  title: "",
  price: "1888000",
  type: "Apparel",
  tags: "Drop 01",
  imageUrl: FALLBACK_IMAGE,
  bodyHtml: "Original terrace apparel crafted from premium heavyweight structured cotton.",
  hasNameset: true,
  namesetPrice: String(DEFAULT_NAMESET_PRICE),
  patchSku: "",
};

const isPublished = (value: AdminProductItem["published"]) =>
  value === null || value === undefined || value === true || String(value).toLowerCase() === "true";

/** Only `active` + published pieces are shown to customers; everything else is hidden. */
function getProductState(item: AdminProductItem): ProductState {
  const status = (item.status || "active").toLowerCase();
  if (status === "archived" || status === "suspended") return status;
  return status === "active" && isPublished(item.published) ? "active" : "draft";
}

function toFormData(item: AdminProductItem): ProductFormData {
  const meta = parseProductCustomizationMeta(item.tags);
  return {
    handle: item.handle,
    title: item.title,
    price: item.primaryVariant?.price ? String(item.primaryVariant.price) : NEW_PRODUCT.price,
    type: item.type || "Apparel",
    tags: item.tags || "Drop 01",
    imageUrl: item.primaryImage?.src || "",
    bodyHtml: item.bodyHtml || "",
    hasNameset: meta.hasNameset,
    namesetPrice: String(meta.namesetPrice),
    patchSku: meta.patchSku,
  };
}

/** Folds the nameset / patch settings back into the product's tag list, where they are stored. */
const withCustomizationTags = (values: ProductFormData) =>
  serializeProductCustomizationMeta(values.tags, {
    hasNameset: values.hasNameset,
    namesetPrice: Number(values.namesetPrice || DEFAULT_NAMESET_PRICE),
    patchSku: values.patchSku,
  });

function PageSizeSelector({ value, onChange }: { value: PageSize; onChange: (size: PageSize) => void }) {
  return (
    <div className="page-size-selector">
      <span>Per page:</span>
      {PAGE_SIZES.map(size => (
        <button key={size} type="button" className={value === size ? "active" : ""} onClick={() => onChange(size)}>
          {size}
        </button>
      ))}
    </div>
  );
}

export default function AdminCatalog() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(15);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modal, setModal] = useState<ModalState>(null);

  const isAdmin = authQuery.data?.role === "admin";
  const searchTerm = search.trim() || undefined;
  const catalogQuery = trpc.adminProducts.list.useQuery({ search: searchTerm, status: statusFilter, page, pageSize });
  const countsQuery = trpc.adminProducts.statusCounts.useQuery({ search: searchTerm }, { enabled: isAdmin });
  const products = (catalogQuery.data?.products ?? []) as AdminProductItem[];
  const totalCount = catalogQuery.data?.total ?? 0;

  const refreshCatalog = () =>
    Promise.all([utils.adminProducts.list.invalidate(), utils.adminProducts.statusCounts.invalidate()]);

  const refreshAndClose = async (message: string) => {
    await refreshCatalog();
    toast.success(message);
    setModal(null);
  };

  const createMutation = trpc.adminProducts.create.useMutation({
    onSuccess: () => refreshAndClose("New piece added to catalog"),
    onError: error => toast.error(error.message || "Failed to create product"),
  });
  const updateMutation = trpc.adminProducts.update.useMutation({
    onSuccess: () => refreshAndClose("Piece updated successfully"),
    onError: error => toast.error(error.message || "Failed to update product"),
  });
  const deleteMutation = trpc.adminProducts.delete.useMutation({
    onSuccess: () => refreshAndClose("Piece removed from catalog"),
    onError: error => toast.error(error.message || "Failed to delete product"),
  });

  const setActiveMutation = trpc.adminProducts.setActive.useMutation({
    onSuccess: async (_result, variables) => {
      await refreshCatalog();
      toast.success(variables.active ? "Piece is now visible to customers" : "Piece hidden from customers");
    },
    onError: error => toast.error(error.message || "Failed to change status"),
  });

  const changeStatusFilter = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changePageSize = (size: PageSize) => {
    setPageSize(size);
    setPage(1);
  };

  const submitProduct = (values: ProductFormData) => {
    const { hasNameset, namesetPrice, patchSku, ...product } = values;
    const payload = { ...product, tags: withCustomizationTags(values) };
    if (modal?.mode === "edit") updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const deleteProduct = (item: AdminProductItem) => {
    if (window.confirm(`Are you sure you want to remove "${item.title}" from the catalog?`)) {
      deleteMutation.mutate({ handle: item.handle });
    }
  };

  if (authQuery.isLoading) {
    return (
      <main className="admin-gate">
        <LoaderCircle className="button-spinner" />
        <p>Checking access…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-gate">
        <Boxes size={32} strokeWidth={1.2} />
        <p className="eyebrow">CFJ administration</p>
        <h1>Sign in to manage the catalog.</h1>
        <p>This area is restricted to store administrators.</p>
        <Link href="/admin/login" className="primary-button">
          Enter Staff Login
        </Link>
      </main>
    );
  }

  const firstShown = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;

  return (
    <PageEntrance>
      <main className="admin-page">
        <AdminHeader
          active="catalog"
          eyebrow="CFJ Concierge / Catalog Management"
          title="Product Index"
          description="Manage piece descriptions, prices, imagery, and inventory across Drop 01 and the archival database."
        />

        <section className="admin-querybar">
          <div className="admin-search">
            <Search size={15} />
            <input
              type="text"
              aria-label="Search pieces"
              placeholder="Search pieces by title or handle…"
              value={search}
              onChange={event => changeSearch(event.target.value)}
            />
          </div>

          <div className="admin-catalog-toolbar-actions">
            <PageSizeSelector value={pageSize} onChange={changePageSize} />
            <button className="primary-button add-product-btn" onClick={() => setModal({ mode: "create" })}>
              <Plus size={16} /> Add New Piece
            </button>
          </div>
        </section>

        <div className="catalog-status-tabs" role="tablist" aria-label="Filter pieces by status">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.value}
              className={statusFilter === filter.value ? "active" : ""}
              onClick={() => changeStatusFilter(filter.value)}
            >
              {filter.label}
              <span>{countsQuery.data?.[filter.value] ?? "–"}</span>
            </button>
          ))}
          <p>Only active pieces are shown to customers.</p>
        </div>

        <section className="catalog-admin-section">
          {catalogQuery.isLoading ? (
            <div className="admin-loading">
              <LoaderCircle size={28} className="button-spinner" />
              <span>Fetching catalog entries…</span>
            </div>
          ) : !products.length ? (
            <div className="admin-empty">
              <Boxes size={32} strokeWidth={1.25} />
              <h2>No pieces found.</h2>
              <p>Try adjusting your search query or add a new piece to the collection.</p>
              <button className="primary-button" onClick={() => setModal({ mode: "create" })}>
                Add First Piece
              </button>
            </div>
          ) : (
            <>
              <div className="admin-products-table-wrap">
                <table className="admin-products-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Slug / Handle</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th className="actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(item => {
                      const state = getProductState(item);
                      const isActive = state === "active";
                      const isToggling = setActiveMutation.isPending && setActiveMutation.variables?.handle === item.handle;
                      return (
                        <tr key={item.handle} className={isActive ? "" : "is-inactive"}>
                          <td className="product-cell-main">
                            <div className="product-thumb">
                              <img src={item.primaryImage?.src || FALLBACK_IMAGE} alt={item.title} />
                            </div>
                            <div>
                              <strong>{item.title}</strong>
                              <small>{item.tags || "Drop 01"}</small>
                            </div>
                          </td>
                          <td>
                            <span className="type-tag">{item.type || "Apparel"}</span>
                          </td>
                          <td>
                            <code>{item.handle}</code>
                          </td>
                          <td>
                            <strong>{formatPrice(toIdrPrice(item.primaryVariant?.price))}</strong>
                          </td>
                          <td>
                            <span className={`status-pill ${isActive ? "published" : state}`}>
                              {STATE_LABELS[state].label}
                            </span>
                            <small className="status-hint">{STATE_LABELS[state].hint}</small>
                          </td>
                          <td className="actions-cell">
                            <button
                              className={`status-toggle-btn ${isActive ? "deactivate" : "activate"}`}
                              title={isActive ? "Hide this piece from customers" : "Show this piece to customers"}
                              disabled={isToggling}
                              onClick={() => setActiveMutation.mutate({ handle: item.handle, active: !isActive })}
                            >
                              {isToggling ? (
                                <LoaderCircle size={13} className="button-spinner" />
                              ) : isActive ? (
                                <EyeOff size={13} />
                              ) : (
                                <Eye size={13} />
                              )}
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="icon-action-btn"
                              title="Edit Piece"
                              onClick={() => setModal({ mode: "edit", product: toFormData(item) })}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="icon-action-btn delete"
                              title="Delete Piece"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteProduct(item)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination-section">
                <div className="pagination-summary">
                  <span>
                    Showing {firstShown}–{Math.min(page * pageSize, totalCount)} of {totalCount} pieces
                  </span>
                </div>
                <PaginationControl
                  currentPage={page}
                  totalPages={catalogQuery.data?.totalPages ?? 1}
                  onPageChange={setPage}
                />
                <PageSizeSelector value={pageSize} onChange={changePageSize} />
              </div>
            </>
          )}
        </section>

        {modal && (
          <ProductFormModal
            key={modal.mode === "edit" ? modal.product.handle : "new"}
            mode={modal.mode}
            initialValues={modal.mode === "edit" ? modal.product : NEW_PRODUCT}
            isSaving={createMutation.isPending || updateMutation.isPending}
            onSubmit={submitProduct}
            onClose={() => setModal(null)}
          />
        )}
      </main>
    </PageEntrance>
  );
}
