import { useT } from "@/i18n";
import { useFormatPrice } from "@/lib/currency";
import { trpc } from "@/lib/trpc";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

export type CatalogAddOn = {
  kind: "nameset" | "patch";
  sku: string;
  handle: string;
  name: string;
  price: number;
  image: string | null;
};

// Short pages keep the list inside the page flow (no scroll box of its own that traps the mouse wheel).
const PAGE_SIZE = 6;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type Props = {
  kind: CatalogAddOn["kind"];
  selected: CatalogAddOn | null;
  onSelect: (addOn: CatalogAddOn | null) => void;
  /** Label of the "nothing selected" row; omitted when a choice is required. */
  noneLabel?: string;
  searchPlaceholder: string;
};

/** Searchable list of catalog products (patches or ready-made namesets), chosen by SKU. */
export function AddOnPicker({ kind, selected, onSelect, noneLabel, searchPlaceholder }: Props) {
  const t = useT();
  const formatPrice = useFormatPrice();
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounced(search, 250);

  useEffect(() => setLimit(PAGE_SIZE), [debouncedSearch]);

  const query = trpc.catalog.addOns.useQuery(
    { kind, search: debouncedSearch || undefined, limit },
    { staleTime: 5 * 60 * 1000, placeholderData: previous => previous }
  );
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className="addon-picker">
      <label className="addon-search">
        <Search size={14} />
        <input
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={event => setSearch(event.target.value)}
          aria-label={searchPlaceholder}
        />
        {query.isFetching && <LoaderCircle size={14} className="animate-spin" />}
      </label>

      <div className="patches-selection-list addon-picker-list" role="radiogroup">
        {noneLabel && (
          <label className={`patch-card ${selected ? "" : "active"}`}>
            <input type="radio" name={`addon-${kind}`} checked={!selected} onChange={() => onSelect(null)} />
            <div className="patch-card-info">
              <span className="patch-title">{noneLabel}</span>
            </div>
            <span className="patch-price">{formatPrice(0)}</span>
          </label>
        )}

        {selected && !items.some(item => item.sku === selected.sku) && (
          <AddOnRow addOn={selected} kind={kind} checked onSelect={onSelect} />
        )}

        {items.map(addOn => (
          <AddOnRow key={addOn.sku} addOn={addOn} kind={kind} checked={selected?.sku === addOn.sku} onSelect={onSelect} />
        ))}

        {!query.isLoading && items.length === 0 && <p className="addon-empty">{t("No matching products found.")}</p>}

        {items.length < total && (
          <button type="button" className="text-button addon-more" onClick={() => setLimit(current => current + PAGE_SIZE)}>
            {t("Show more ({count} left)", { count: total - items.length })}
          </button>
        )}
      </div>
    </div>
  );
}

function AddOnRow({
  addOn,
  kind,
  checked,
  onSelect,
}: {
  addOn: CatalogAddOn;
  kind: CatalogAddOn["kind"];
  checked: boolean;
  onSelect: (addOn: CatalogAddOn) => void;
}) {
  const t = useT();
  const formatPrice = useFormatPrice();
  return (
    <label className={`patch-card ${checked ? "active" : ""}`}>
      <input type="radio" name={`addon-${kind}`} checked={checked} onChange={() => onSelect(addOn)} />
      {addOn.image ? (
        <img className="addon-thumb" src={addOn.image} alt="" loading="lazy" />
      ) : (
        <span className="addon-thumb" aria-hidden />
      )}
      <div className="patch-card-info">
        <span className="patch-title">{addOn.name}</span>
        <span className="sku-pill">
          {t("SKU:")} {addOn.sku}
        </span>
      </div>
      <span className="patch-price">+{formatPrice(addOn.price)}</span>
    </label>
  );
}
