import { useT } from "@/i18n";
import { applyDetectedCountry, applyLiveRates, detectBrowserCountry, selectRegion, useRegion } from "@/lib/currency";
import { trpc } from "@/lib/trpc";
import { STORE_REGIONS, type StoreRegion } from "@shared/regions";
import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Picks the visitor's region on first load: the hosting edge's country header
 * when available, otherwise the browser's time zone. A manual choice always wins.
 */
function useRegionAutoDetect() {
  const regionQuery = trpc.region.current.useQuery(undefined, { staleTime: Infinity, retry: false });
  const { data, isFetched } = regionQuery;

  useEffect(() => {
    if (!isFetched) return;
    if (data) applyLiveRates(data.rates);
    applyDetectedCountry(data?.country ?? detectBrowserCountry());
  }, [data, isFetched]);
}

export function CountryCurrencySelector() {
  const t = useT();
  useRegionAutoDetect();
  const { region: selected } = useRegion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click and focus the search box when the list opens.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(focusTimer);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return STORE_REGIONS;
    return STORE_REGIONS.filter(region =>
      [region.country, t(region.country), region.currency, region.symbol, region.code].some(value => value.toLowerCase().includes(query))
    );
  }, [search, t]);

  const handleSelect = (region: StoreRegion) => {
    selectRegion(region);
    setOpen(false);
    setSearch("");
    toast.success(
      t("Region & currency set to {country} ({currency})", {
        country: t(region.country),
        currency: `${region.currency} ${region.symbol}`,
      })
    );
  };

  return (
    <div className="country-currency-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="country-currency-trigger"
        onClick={() => setOpen(value => !value)}
        aria-label={t("Current Region: {country} ({currency})", {
          country: t(selected.country),
          currency: `${selected.currency} ${selected.symbol}`,
        })}
      >
        <span className="country-flag-icon">{selected.flag}</span>
        <span className="country-trigger-text">
          {selected.currency} {selected.symbol}
        </span>
        <ChevronDown size={13} className={`chevron-indicator ${open ? "rotate" : ""}`} />
      </button>

      {open && (
        <div className="country-currency-dropdown" role="dialog" aria-modal="true">
          <div className="country-search-pill">
            <label htmlFor="country-currency-search" className="country-search-label">
              {t("Search")}
            </label>
            <div className="country-search-input-wrap">
              <input
                ref={searchInputRef}
                id="country-currency-search"
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {search && (
                <button
                  type="button"
                  className="country-search-clear"
                  onClick={() => setSearch("")}
                  aria-label={t("Clear search")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="country-currency-list">
            {filtered.length === 0 ? (
              <div className="country-currency-empty">
                <p>{t('No region found matching "{query}"', { query: search })}</p>
              </div>
            ) : (
              filtered.map(region => {
                const isSelected = region.code === selected.code;
                return (
                  <button
                    key={region.code}
                    type="button"
                    className={`country-currency-row ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(region)}
                  >
                    <div className="country-row-left">
                      <span className="country-check-slot">
                        {isSelected && <Check size={16} strokeWidth={2.2} className="country-check-icon" />}
                      </span>
                      <span className="country-name-text">{t(region.country)}</span>
                    </div>
                    <div className="country-row-right">
                      <span className="country-currency-badge">
                        {region.currency} {region.symbol}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
