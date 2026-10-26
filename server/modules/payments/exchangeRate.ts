import axios from "axios";

interface ExchangeRateCache {
  idrPerUsd: number;
  lastFetchedAt: number;
}

// Real-time update cache (15 seconds) so every checkout uses live tick rates
let cache: ExchangeRateCache = {
  idrPerUsd: 17763,
  lastFetchedAt: 0,
};

const CACHE_TTL_MS = 15 * 1000; // 15 seconds real-time window

/**
 * Fetches the real-time USD/IDR exchange rate from public live forex APIs.
 * Includes automatic caching and multiple failover sources.
 */
export async function getUsdToIdrRate(): Promise<number> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return cache.idrPerUsd || 17763;
  }

  const now = Date.now();

  // Return cached rate if fresh
  if (cache.lastFetchedAt > 0 && now - cache.lastFetchedAt < CACHE_TTL_MS) {
    return cache.idrPerUsd;
  }

  // 1. Try Primary Source: Authenticated / Public ExchangeRate-API
  try {
    const apiKey = process.env.EXCHANGERATE_API_KEY;
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      : "https://open.er-api.com/v6/latest/USD";

    const res = await axios.get(url, { timeout: 4000 });
    const idrRate = res.data?.conversion_rates?.IDR || res.data?.rates?.IDR;
    if (typeof idrRate === "number" && idrRate > 10000 && idrRate < 25000) {
      cache = { idrPerUsd: idrRate, lastFetchedAt: now };
      return idrRate;
    }
  } catch (err: any) {
    console.warn("[ExchangeRate] Primary rate source failed, attempting fallback:", err.message);
  }

  // 2. Try Fallback Source: Fawaz Ahmed Currency API
  try {
    const fallbackRes = await axios.get(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { timeout: 4000 }
    );
    const idrRate = fallbackRes.data?.usd?.idr;
    if (typeof idrRate === "number" && idrRate > 10000 && idrRate < 25000) {
      cache = { idrPerUsd: idrRate, lastFetchedAt: now };
      return idrRate;
    }
  } catch (err: any) {
    console.warn("[ExchangeRate] Fallback rate source failed:", err.message);
  }

  // 3. Fallback to existing cached rate or safe baseline
  return cache.idrPerUsd || 16200;
}

/**
 * Converts an IDR amount into USD (rounded to 2 decimal places) using real-time rate.
 */
export async function convertIdrToUsd(idrAmount: number): Promise<number> {
  const rate = await getUsdToIdrRate();
  const usd = idrAmount / rate;
  return Number(usd.toFixed(2));
}

const DISPLAY_RATES_TTL_MS = 60 * 60 * 1000;
let displayRates: { unitsPerIdr: Record<string, number>; fetchedAt: number } | null = null;

/**
 * How many units of each currency one rupiah buys, for displaying storefront
 * prices in the visitor's currency. Cached for an hour; returns the last known
 * rates (or null) when the rate source is unreachable.
 */
export async function getCurrencyUnitsPerIdr(): Promise<Record<string, number> | null> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
  if (displayRates && Date.now() - displayRates.fetchedAt < DISPLAY_RATES_TTL_MS) return displayRates.unitsPerIdr;

  try {
    // Quoted against USD and re-based here: IDR-based quotes are rounded too coarsely to be usable.
    const res = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 4000 });
    const perUsd: Record<string, number> | undefined = res.data?.rates;
    const idrPerUsd = perUsd?.IDR;
    if (perUsd && typeof idrPerUsd === "number" && idrPerUsd > 0) {
      const unitsPerIdr = Object.fromEntries(
        Object.entries(perUsd).map(([currency, rate]) => [currency, rate / idrPerUsd])
      );
      displayRates = { unitsPerIdr, fetchedAt: Date.now() };
    }
  } catch (error) {
    console.warn("[ExchangeRate] Display rates unavailable:", error instanceof Error ? error.message : error);
  }
  return displayRates?.unitsPerIdr ?? null;
}

