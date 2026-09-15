import { FadeIn, PageEntrance } from "@/components/MotionReveal";
import { PaginationControl } from "@/components/PaginationControl";
import { formatPrice } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Edit,
  ExternalLink,
  Layers,
  LoaderCircle,
  LogOut,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

interface ProductFormData {
  handle: string;
  title: string;
  price: string;
  type: string;
  tags: string;
  imageUrl: string;
  bodyHtml: string;
}

const DEFAULT_FORM: ProductFormData = {
  handle: "",
  title: "",
  price: "1888000",
  type: "Apparel",
  tags: "Drop 01",
  imageUrl: "/manus-storage/terrace-junction-v2_75e8572e.jpg",
  bodyHtml: "Original terrace apparel crafted from premium heavyweight structured cotton.",
};

interface AdminProductItem {
  handle: string;
  title: string;
  bodyHtml?: string | null;
  vendor?: string | null;
  type?: string | null;
  tags?: string | null;
  published?: string | boolean | null;
  primaryVariant?: { price?: string | number | null } | null;
  primaryImage?: { src?: string | null } | null;
}

export default function AdminCatalog() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed out successfully");
      setLocation("/admin/login");
    },
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 15>(15);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(DEFAULT_FORM);

  const catalogQuery = trpc.adminProducts.list.useQuery({
    search: search.trim() || undefined,
    page,
    pageSize,
  });

  const productsList = (catalogQuery.data?.products || []) as unknown as AdminProductItem[];
  const totalPages = catalogQuery.data?.totalPages || 1;
  const totalCount = catalogQuery.data?.total || 0;

  const createMutation = trpc.adminProducts.create.useMutation({
    onSuccess: async () => {
      await utils.adminProducts.list.invalidate();
      toast.success("New piece added to catalog");
      setIsCreateOpen(false);
      setFormData(DEFAULT_FORM);
    },
    onError: err => toast.error(err.message || "Failed to create product"),
  });

  const updateMutation = trpc.adminProducts.update.useMutation({
    onSuccess: async () => {
      await utils.adminProducts.list.invalidate();
      toast.success("Piece updated successfully");
      setEditingProduct(null);
    },
    onError: err => toast.error(err.message || "Failed to update product"),
  });

  const deleteMutation = trpc.adminProducts.delete.useMutation({
    onSuccess: async () => {
      await utils.adminProducts.list.invalidate();
      toast.success("Piece removed from catalog");
    },
    onError: err => toast.error(err.message || "Failed to delete product"),
  });

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      price: formData.price,
    });
  };

  const handleUpdateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateMutation.mutate({
      handle: editingProduct.handle,
      title: editingProduct.title,
      price: editingProduct.price,
      type: editingProduct.type,
      tags: editingProduct.tags,
      imageUrl: editingProduct.imageUrl,
      bodyHtml: editingProduct.bodyHtml,
    });
  };

  const handleDelete = (handle: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) {
      deleteMutation.mutate({ handle });
    }
  };

  return (
    <PageEntrance>
      <main className="admin-page">
        {/* Header */}
        <header className="admin-header">
          <div>
            <p className="eyebrow">CFJ Concierge / Catalog Management</p>
            <h1>Product Index</h1>
            <p>
              Manage piece descriptions, prices, imagery, and inventory across Drop 01 and the archival database.
            </p>
          </div>

          <div className="admin-nav-actions">
            <Link href="/admin/orders" className="admin-nav-tab">
              Order Requests
            </Link>
            <Link href="/admin/catalog" className="admin-nav-tab active">
              Catalog (CMS)
            </Link>
            <Link href="/" className="admin-store-link">
              Storefront <ExternalLink size={12} />
            </Link>
            <button
              className="admin-logout-btn"
              onClick={() => logoutMutation.mutate()}
              title="Sign out of Admin"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <section className="admin-querybar">
          <div className="admin-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search pieces by title or handle…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="admin-catalog-toolbar-actions">
            <div className="page-size-selector">
              <span>Per page:</span>
              <button
                type="button"
                className={pageSize === 10 ? "active" : ""}
                onClick={() => {
                  setPageSize(10);
                  setPage(1);
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
                }}
              >
                15
              </button>
            </div>

            <button className="primary-button add-product-btn" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> Add New Piece
            </button>
          </div>
        </section>

        {/* Product Table */}
        <section className="catalog-admin-section">
          {catalogQuery.isLoading ? (
            <div className="admin-loading">
              <LoaderCircle size={28} className="button-spinner" />
              <span>Fetching catalog entries…</span>
            </div>
          ) : !catalogQuery.data?.products.length ? (
            <div className="admin-empty">
              <Boxes size={32} strokeWidth={1.25} />
              <h2>No pieces found.</h2>
              <p>Try adjusting your search query or add a new piece to the collection.</p>
              <button className="primary-button" onClick={() => setIsCreateOpen(true)}>
                Add First Piece
              </button>
            </div>
          ) : (
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
                  {productsList.map(item => {
                    const priceRaw = Number(item.primaryVariant?.price || 1888000);
                    const priceNum = priceRaw < 5000 ? Math.round(priceRaw * 20000) : priceRaw;
                    const imgSrc = item.primaryImage?.src || "/manus-storage/terrace-junction-v2_75e8572e.jpg";
                    return (
                      <tr key={item.handle}>
                        <td className="product-cell-main">
                          <div className="product-thumb">
                            {imgSrc ? (
                              <img src={imgSrc} alt={item.title} />
                            ) : (
                              <div className="no-thumb" />
                            )}
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
                          <strong>{formatPrice(priceNum)}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${item.published ? "published" : "draft"}`}>
                            {item.published ? "Active" : "Draft"}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="icon-action-btn"
                            title="Edit Piece"
                            onClick={() =>
                              setEditingProduct({
                                handle: item.handle,
                                title: item.title,
                                price: item.primaryVariant?.price ? String(item.primaryVariant.price) : "1888000",
                                type: item.type || "Apparel",
                                tags: item.tags || "Drop 01",
                                imageUrl: item.primaryImage?.src || "",
                                bodyHtml: item.bodyHtml || "",
                              })
                            }
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="icon-action-btn delete"
                            title="Delete Piece"
                            onClick={() => handleDelete(item.handle, item.title)}
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
          )}

          {/* Pagination Section */}
          {Boolean(catalogQuery.data?.products?.length) && (
            <div className="pagination-section">
              <div className="pagination-summary">
                <span>
                  Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} pieces
                </span>
              </div>

              <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />

              <div className="page-size-selector">
                <span>Per page:</span>
                <button
                  type="button"
                  className={pageSize === 10 ? "active" : ""}
                  onClick={() => {
                    setPageSize(10);
                    setPage(1);
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
                  }}
                >
                  15
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Create Modal */}
        {isCreateOpen && (
          <div className="admin-modal-overlay" onClick={() => setIsCreateOpen(false)}>
            <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Catalog CMS / Drop 01</p>
                  <h2>Add New Piece</h2>
                </div>
                <button className="icon-button" onClick={() => setIsCreateOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="admin-form">
                <div className="form-row">
                  <label>
                    Piece Title
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => {
                        const title = e.target.value;
                        const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                        setFormData(d => ({ ...d, title, handle: d.handle ? d.handle : handle }));
                      }}
                      placeholder="e.g. Concourse Overcoat"
                    />
                  </label>

                  <label>
                    Handle (Slug)
                    <input
                      type="text"
                      required
                      value={formData.handle}
                      onChange={e => setFormData(d => ({ ...d, handle: e.target.value }))}
                      placeholder="concourse-overcoat"
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    Price (IDR)
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={e => setFormData(d => ({ ...d, price: e.target.value }))}
                      placeholder="1888000"
                    />
                  </label>

                  <label>
                    Category / Type
                    <input
                      type="text"
                      value={formData.type}
                      onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}
                      placeholder="Outerwear"
                    />
                  </label>
                </div>

                <label>
                  Image Asset Path / URL
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={e => setFormData(d => ({ ...d, imageUrl: e.target.value }))}
                    placeholder="/manus-storage/terrace-junction-v2_75e8572e.jpg"
                  />
                </label>

                <label>
                  Editorial Story / Description
                  <textarea
                    rows={3}
                    value={formData.bodyHtml}
                    onChange={e => setFormData(d => ({ ...d, bodyHtml: e.target.value }))}
                    placeholder="Details on the fabric, fit, and origin of the design..."
                  />
                </label>

                <div className="modal-actions">
                  <button type="button" className="text-button" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`primary-button ${createMutation.isPending ? "is-loading" : ""}`}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Publishing..." : "Publish to Catalog"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
          <div className="admin-modal-overlay" onClick={() => setEditingProduct(null)}>
            <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Catalog CMS / Edit Piece</p>
                  <h2>{editingProduct.title}</h2>
                </div>
                <button className="icon-button" onClick={() => setEditingProduct(null)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="admin-form">
                <label>
                  Piece Title
                  <input
                    type="text"
                    required
                    value={editingProduct.title}
                    onChange={e => setEditingProduct(d => (d ? { ...d, title: e.target.value } : null))}
                  />
                </label>

                <div className="form-row">
                  <label>
                    Price (IDR)
                    <input
                      type="number"
                      required
                      value={editingProduct.price}
                      onChange={e => setEditingProduct(d => (d ? { ...d, price: e.target.value } : null))}
                    />
                  </label>

                  <label>
                    Category / Type
                    <input
                      type="text"
                      value={editingProduct.type}
                      onChange={e => setEditingProduct(d => (d ? { ...d, type: e.target.value } : null))}
                    />
                  </label>
                </div>

                <label>
                  Image Asset Path / URL
                  <input
                    type="text"
                    value={editingProduct.imageUrl}
                    onChange={e => setEditingProduct(d => (d ? { ...d, imageUrl: e.target.value } : null))}
                  />
                </label>

                <label>
                  Editorial Story / Description
                  <textarea
                    rows={3}
                    value={editingProduct.bodyHtml}
                    onChange={e => setEditingProduct(d => (d ? { ...d, bodyHtml: e.target.value } : null))}
                  />
                </label>

                <div className="modal-actions">
                  <button type="button" className="text-button" onClick={() => setEditingProduct(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`primary-button ${updateMutation.isPending ? "is-loading" : ""}`}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </PageEntrance>
  );
}
