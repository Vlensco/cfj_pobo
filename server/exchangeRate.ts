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

/**
 * Converts an IDR amount into USD cents (integer) for Paddle Billing line items.
 */
export async function convertIdrToUsdCents(idrAmount: number): Promise<number> {
  const rate = await getUsdToIdrRate();
  const usdCents = Math.round((idrAmount / rate) * 100);
  return Math.max(100, usdCents);
}
