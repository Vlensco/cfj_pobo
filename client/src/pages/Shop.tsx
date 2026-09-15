import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { PaginationControl } from "@/components/PaginationControl";
import { ProductCard } from "@/components/ProductCard";
import { dbProductToStoreProduct, productCatalog } from "@/data/catalog";
import { trpc } from "@/lib/trpc";
import {
  applyCatalogPreferences,
  CATEGORY_OPTIONS,
  CatalogPreferences,
  defaultCatalogPreferences,
  PRICE_OPTIONS,
  readCatalogPreferences,
  SORT_OPTIONS,
  writeCatalogPreferences,
} from "@/lib/catalogFilters";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function getCurrentPreferences() {
  return readCatalogPreferences(window.location.search);
}

export default function Shop() {
  const [preferences, setPreferences] = useState<CatalogPreferences>(getCurrentPreferences);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const catalogQuery = trpc.adminProducts.list.useQuery({ pageSize: 100 });

  useEffect(() => {
    const onPopState = () => setPreferences(getCurrentPreferences());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const updatePreferences = (patch: Partial<CatalogPreferences>) => {
    setPreferences(current => {
      const next = { ...current, ...patch };
      window.history.replaceState(null, "", `${window.location.pathname}${writeCatalogPreferences(next)}`);
      return next;
    });
    setPage(1);
  };

  const allProducts = useMemo(() => {
    if (catalogQuery.data?.products?.length) {
      return catalogQuery.data.products.map(dbProductToStoreProduct);
    }
    return productCatalog;
  }, [catalogQuery.data?.products]);

  const products = useMemo(() => applyCatalogPreferences(allProducts, preferences), [allProducts, preferences]);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page, pageSize]);

  const filtersActive =
    preferences.query.trim() !== "" ||
    preferences.category !== "all" ||
    preferences.price !== "all" ||
    preferences.sort !== "featured";

  const resetFilters = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setPreferences(defaultCatalogPreferences);
    setPage(1);
  };

  return (
    <PageEntrance>
      <main className="shop-page">
        <FadeIn delay={0.05} y={15}>
          <section className="shop-heading">
            <div className="shop-heading-main">
              <p className="eyebrow">01 / The first release</p>
              <h1>
                For the hours
                <br />
                around the game.
              </h1>
            </div>
            <div className="shop-heading-desc">
              <p>Original pieces in four quiet movements. Designed in small runs, worn long after the final whistle.</p>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.3} y={20}>
          <section className="catalog-filter-panel" aria-label="Catalog filters">
            <div className="filter-panel-head">
              <div>
                <p className="eyebrow">
                  <SlidersHorizontal size={13} /> Refine the study
                </p>
                <p className="filter-summary" aria-live="polite">
                  {products.length} {products.length === 1 ? "piece" : "pieces"} in view
                </p>
              </div>
              {filtersActive && (
                <button className="reset-filters" onClick={resetFilters}>
                  <RotateCcw size={13} /> Reset
                </button>
              )}
            </div>

            <div className="catalog-search">
              <Search size={17} aria-hidden="true" />
              <label className="sr-only" htmlFor="catalog-search">
                Search the collection
              </label>
              <input
                id="catalog-search"
                value={preferences.query}
                onChange={event => updatePreferences({ query: event.target.value })}
                placeholder="Search pieces, fabric, colour…"
                autoComplete="off"
              />
            </div>

            <div className="catalog-controls">
              <div className="filter-list" aria-label="Filter by category">
                {CATEGORY_OPTIONS.map(category => (
                  <button
                    key={category.value}
                    className={preferences.category === category.value ? "active" : ""}
                    onClick={() => updatePreferences({ category: category.value })}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="catalog-selects">
                <label className="sort-select">
                  Price{" "}
                  <select
                    value={preferences.price}
                    onChange={event =>
                      updatePreferences({ price: event.target.value as CatalogPreferences["price"] })
                    }
                  >
                    {PRICE_OPTIONS.map(option => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sort-select">
                  Sort{" "}
                  <select
                    value={preferences.sort}
                    onChange={event =>
                      updatePreferences({ sort: event.target.value as CatalogPreferences["sort"] })
                    }
                  >
                    {SORT_OPTIONS.map(option => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>
        </FadeIn>

        {paginatedProducts.length ? (
          <>
            <StaggerContainer className="catalog-grid" staggerDelay={0.08}>
              {paginatedProducts.map((product, index) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} priority={index < 2} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="pagination-section">
              <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 400, behavior: "smooth" });
                }}
              />

              <div className="pagination-summary">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, products.length)} of {products.length} pieces
                </span>
                <div className="page-size-selector">
                  <span>Per page:</span>
                  {[6, 12, 18].map(size => (
                    <button
                      key={size}
                      className={pageSize === size ? "active" : ""}
                      onClick={() => {
                        setPageSize(size);
                        setPage(1);
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <FadeIn>
            <div className="catalog-empty">
              <p className="eyebrow">No pieces in this view</p>
              <h2>Try a different study.</h2>
              <p>Adjust the search, category, or price range to return to the collection.</p>
              <button className="primary-button" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          </FadeIn>
        )}
      </main>
    </PageEntrance>
  );
}
