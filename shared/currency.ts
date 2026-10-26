const ZERO_DECIMAL_CURRENCIES = new Set([
  "jpy", "krw", "vnd", "clp", "pyg", "bif", "djf", "gnf", "kmf", "mga", "rwf", "ugx", "vuv", "xaf", "xof", "xpf",
]);

/**
 * Stripe reports amounts in minor units, except for currencies that have none.
 * IDR counts as a 2-decimal currency there, so IDR amounts are divided by 100.
 */
export const isZeroDecimalCurrency = (currency: string) => ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());

/** Converts a Stripe minor-unit amount into the currency's major unit. */
export const fromMinorUnits = (amount: number | null | undefined, currency: string) =>
  (amount ?? 0) / (isZeroDecimalCurrency(currency) ? 1 : 100);
