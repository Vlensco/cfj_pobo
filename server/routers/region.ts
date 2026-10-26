import type { Request } from "express";
import { SUPPORTED_CURRENCIES } from "../../shared/regions";
import { publicProcedure, router } from "../_core/trpc";
import { getCurrencyUnitsPerIdr } from "../modules/payments/exchangeRate";

/** Headers set by the hosting edge with the visitor's country (Vercel, Cloudflare). */
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry"];

function readVisitorCountry(req: Request): string | null {
  for (const header of COUNTRY_HEADERS) {
    const value = req.headers[header];
    if (typeof value === "string" && /^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  }
  return null;
}

export const regionRouter = router({
  /**
   * The visitor's country (when the host can tell) and live display rates.
   * Rates are for showing prices only: checkout is always priced in IDR by the server.
   */
  current: publicProcedure.query(async ({ ctx }) => {
    const allRates = await getCurrencyUnitsPerIdr();
    const rates: Record<string, number> = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      const rate = allRates?.[currency];
      if (typeof rate === "number" && rate > 0) rates[currency] = rate;
    }
    return { country: readVisitorCountry(ctx.req), rates };
  }),
});
