import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type CountryCurrency = {
  code: string;
  country: string;
  currency: string;
  symbol: string;
  flag: string;
  rateFromIdr: number;
};

export const COUNTRY_CURRENCIES: CountryCurrency[] = [
  { code: "DE", country: "Germany", currency: "EUR", symbol: "€", flag: "🇩🇪", rateFromIdr: 1 / 17500 },
  { code: "ES", country: "Spain", currency: "EUR", symbol: "€", flag: "🇪🇸", rateFromIdr: 1 / 17500 },
  { code: "GB", country: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧", rateFromIdr: 1 / 20500 },
  { code: "US", country: "United States", currency: "USD", symbol: "$", flag: "🇺🇸", rateFromIdr: 1 / 16200 },
  { code: "ID", country: "Indonesia", currency: "IDR", symbol: "Rp", flag: "🇮🇩", rateFromIdr: 1 },
  { code: "FR", country: "France", currency: "EUR", symbol: "€", flag: "🇫🇷", rateFromIdr: 1 / 17500 },
  { code: "IT", country: "Italy", currency: "EUR", symbol: "€", flag: "🇮🇹", rateFromIdr: 1 / 17500 },
  { code: "NL", country: "Netherlands", currency: "EUR", symbol: "€", flag: "🇳🇱", rateFromIdr: 1 / 17500 },
  { code: "JP", country: "Japan", currency: "JPY", symbol: "¥", flag: "🇯🇵", rateFromIdr: 1 / 110 },
  { code: "AU", country: "Australia", currency: "AUD", symbol: "$", flag: "🇦🇺", rateFromIdr: 1 / 10600 },
  { code: "SG", country: "Singapore", currency: "SGD", symbol: "$", flag: "🇸🇬", rateFromIdr: 1 / 12200 },
  { code: "MY", country: "Malaysia", currency: "MYR", symbol: "RM", flag: "🇲🇾", rateFromIdr: 1 / 3700 },
  { code: "CA", country: "Canada", currency: "CAD", symbol: "$", flag: "🇨🇦", rateFromIdr: 1 / 11800 },
  { code: "KR", country: "South Korea", currency: "KRW", symbol: "₩", flag: "🇰🇷", rateFromIdr: 1 / 12 },
  { code: "CH", country: "Switzerland", currency: "CHF", symbol: "CHF", flag: "🇨🇭", rateFromIdr: 1 / 18500 },
  { code: "HK", country: "Hong Kong", currency: "HKD", symbol: "$", flag: "🇭🇰", rateFromIdr: 1 / 2080 },
  { code: "AE", country: "United Arab Emirates", currency: "AED", symbol: "AED", flag: "🇦🇪", rateFromIdr: 1 / 4400 },
  { code: "SA", country: "Saudi Arabia", currency: "SAR", symbol: "SAR", flag: "🇸🇦", rateFromIdr: 1 / 4300 },
];

const STORAGE_KEY = "cfj_selected_country_currency";

export function CountryCurrencySelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<CountryCurrency>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = COUNTRY_CURRENCIES.find(c => c.code === parsed.code);
        if (match) return match;
      }
    } catch {}
    return COUNTRY_CURRENCIES[0]; // Germany (EUR €) default like screenshot
  });

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_CURRENCIES;
    return COUNTRY_CURRENCIES.filter(
      item =>
        item.country.toLowerCase().includes(q) ||
        item.currency.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (item: CountryCurrency) => {
    setSelected(item);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    } catch {}
    setOpen(false);
    setSearch("");
    toast.success(`Region & currency set to ${item.country} (${item.currency} ${item.symbol})`);
  };

  return (
    <div className="country-currency-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="country-currency-trigger"
        onClick={() => setOpen(v => !v)}
        aria-label={`Current Region: ${selected.country} (${selected.currency} ${selected.symbol})`}
      >
        <span className="country-flag-icon">{selected.flag}</span>
        <span className="country-trigger-text">{selected.currency} {selected.symbol}</span>
        <ChevronDown size={13} className={`chevron-indicator ${open ? "rotate" : ""}`} />
      </button>

      {open && (
        <div className="country-currency-dropdown" role="dialog" aria-modal="true">
          {/* Search Pill Input Matching Screenshot */}
          <div className="country-search-pill">
            <label htmlFor="country-currency-search" className="country-search-label">
              Search
            </label>
            <div className="country-search-input-wrap">
              <input
                ref={searchInputRef}
                id="country-currency-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder=""
                autoComplete="off"
                spellCheck={false}
              />
              {search && (
                <button
                  type="button"
                  className="country-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Country Items List */}
          <div className="country-currency-list">
            {filtered.length === 0 ? (
              <div className="country-currency-empty">
                <p>No region found matching "{search}"</p>
              </div>
            ) : (
              filtered.map(item => {
                const isSelected = item.code === selected.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`country-currency-row ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="country-row-left">
                      <span className="country-check-slot">
                        {isSelected && <Check size={16} strokeWidth={2.2} className="country-check-icon" />}
                      </span>
                      <span className="country-name-text">{item.country}</span>
                    </div>
                    <div className="country-row-right">
                      <span className="country-currency-badge">
                        {item.currency} {item.symbol}
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
