import { BASE_CURRENCY, DEFAULT_REGION, findRegion, type StoreRegion } from "@shared/regions";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Display currency for the storefront.
 * Catalog prices are stored in IDR and checkout is always priced in IDR by the
 * server; this module only converts amounts for display.
 */
type CurrencyState = {
  region: StoreRegion;
  /** True once the visitor picked a region themselves; auto-detection never overrides it. */
  isManual: boolean;
  /** Live rates (currency units per rupiah) from the server, when available. */
  unitsPerIdr: Record<string, number>;
};

// v2: earlier versions saved a region that never affected prices, so those values are ignored.
const STORAGE_KEY = "cfj_region_v2";
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW"]);

/** Browser time zones that identify a supported region when the server cannot see the visitor's country. */
const TIME_ZONE_COUNTRIES: Record<string, string> = {
  "Asia/Jakarta": "ID",
  "Asia/Pontianak": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Hong_Kong": "HK",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Zurich": "CH",
};
const TIME_ZONE_PREFIX_COUNTRIES: Array<[prefix: string, country: string]> = [
  ["Australia/", "AU"],
  ["America/Toronto", "CA"],
  ["America/Vancouver", "CA"],
  ["America/Edmonton", "CA"],
  ["America/Winnipeg", "CA"],
  ["America/Halifax", "CA"],
  ["America/New_York", "US"],
  ["America/Chicago", "US"],
  ["America/Denver", "US"],
  ["America/Los_Angeles", "US"],
  ["America/Phoenix", "US"],
  ["America/Anchorage", "US"],
  ["Pacific/Honolulu", "US"],
];

function readSavedRegion(): StoreRegion | null {
  try {
    return findRegion(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

const savedRegion = typeof window === "undefined" ? null : readSavedRegion();
let state: CurrencyState = {
  region: savedRegion ?? DEFAULT_REGION,
  isManual: Boolean(savedRegion),
  unitsPerIdr: {},
};
const listeners = new Set<() => void>();

function setState(next: Partial<CurrencyState>) {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getState = () => state;

/** Best guess at the visitor's country from the browser alone (time zone first, then language). */
export function detectBrowserCountry(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const byZone =
      TIME_ZONE_COUNTRIES[timeZone] ?? TIME_ZONE_PREFIX_COUNTRIES.find(([prefix]) => timeZone.startsWith(prefix))?.[1];
    if (byZone) return byZone;

    const languageRegion = navigator.language?.split("-")[1];
    return languageRegion ? languageRegion.toUpperCase() : null;
  } catch {
    return null;
  }
}

/** The visitor chose a region themselves: remember it and stop auto-detecting. */
export function selectRegion(region: StoreRegion) {
  setState({ region, isManual: true });
  try {
    localStorage.setItem(STORAGE_KEY, region.code);
  } catch {
    // Storage unavailable: the choice still applies for this visit.
  }
}

/** Applies a detected country unless the visitor already chose a region. Unsupported countries keep the default. */
export function applyDetectedCountry(countryCode: string | null | undefined) {
  if (state.isManual) return;
  const region = findRegion(countryCode);
  if (region && region.code !== state.region.code) setState({ region });
}

export function applyLiveRates(unitsPerIdr: Record<string, number>) {
  if (Object.keys(unitsPerIdr).length > 0) setState({ unitsPerIdr });
}

/** Formats an IDR amount in the given region's currency. */
export function formatInRegion(amountIdr: number, region: StoreRegion, unitsPerIdr: Record<string, number> = {}) {
  const isBase = region.currency === BASE_CURRENCY;
  const rate = isBase ? 1 : (unitsPerIdr[region.currency] ?? 1 / region.fallbackIdrPerUnit);
  return new Intl.NumberFormat(isBase ? "id-ID" : "en-US", {
    style: "currency",
    currency: region.currency,
    maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(region.currency) ? 0 : 2,
  }).format(amountIdr * rate);
}

export function useRegion() {
  const { region } = useSyncExternalStore(subscribe, getState, getState);
  return { region, isBaseCurrency: region.currency === BASE_CURRENCY };
}

/** Price formatter for storefront components: converts IDR amounts into the visitor's display currency. */
export function useFormatPrice() {
  const { region, unitsPerIdr } = useSyncExternalStore(subscribe, getState, getState);
  return useCallback((amountIdr: number) => formatInRegion(amountIdr, region, unitsPerIdr), [region, unitsPerIdr]);
}
