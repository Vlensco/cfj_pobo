/** A country the storefront can display prices for. Catalog prices themselves are always stored in IDR. */
export type StoreRegion = {
  /** ISO 3166-1 alpha-2 country code. */
  code: string;
  country: string;
  currency: string;
  symbol: string;
  flag: string;
  /** Approximate IDR per one unit of the currency, used until live rates load. */
  fallbackIdrPerUnit: number;
};

export const BASE_CURRENCY = "IDR";

export const STORE_REGIONS: StoreRegion[] = [
  { code: "ID", country: "Indonesia", currency: "IDR", symbol: "Rp", flag: "🇮🇩", fallbackIdrPerUnit: 1 },
  { code: "SG", country: "Singapore", currency: "SGD", symbol: "$", flag: "🇸🇬", fallbackIdrPerUnit: 12200 },
  { code: "MY", country: "Malaysia", currency: "MYR", symbol: "RM", flag: "🇲🇾", fallbackIdrPerUnit: 3700 },
  { code: "US", country: "United States", currency: "USD", symbol: "$", flag: "🇺🇸", fallbackIdrPerUnit: 16200 },
  { code: "GB", country: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧", fallbackIdrPerUnit: 20500 },
  { code: "DE", country: "Germany", currency: "EUR", symbol: "€", flag: "🇩🇪", fallbackIdrPerUnit: 17500 },
  { code: "ES", country: "Spain", currency: "EUR", symbol: "€", flag: "🇪🇸", fallbackIdrPerUnit: 17500 },
  { code: "FR", country: "France", currency: "EUR", symbol: "€", flag: "🇫🇷", fallbackIdrPerUnit: 17500 },
  { code: "IT", country: "Italy", currency: "EUR", symbol: "€", flag: "🇮🇹", fallbackIdrPerUnit: 17500 },
  { code: "NL", country: "Netherlands", currency: "EUR", symbol: "€", flag: "🇳🇱", fallbackIdrPerUnit: 17500 },
  { code: "CH", country: "Switzerland", currency: "CHF", symbol: "CHF", flag: "🇨🇭", fallbackIdrPerUnit: 18500 },
  { code: "JP", country: "Japan", currency: "JPY", symbol: "¥", flag: "🇯🇵", fallbackIdrPerUnit: 110 },
  { code: "KR", country: "South Korea", currency: "KRW", symbol: "₩", flag: "🇰🇷", fallbackIdrPerUnit: 12 },
  { code: "HK", country: "Hong Kong", currency: "HKD", symbol: "$", flag: "🇭🇰", fallbackIdrPerUnit: 2080 },
  { code: "AU", country: "Australia", currency: "AUD", symbol: "$", flag: "🇦🇺", fallbackIdrPerUnit: 10600 },
  { code: "CA", country: "Canada", currency: "CAD", symbol: "$", flag: "🇨🇦", fallbackIdrPerUnit: 11800 },
  { code: "AE", country: "United Arab Emirates", currency: "AED", symbol: "AED", flag: "🇦🇪", fallbackIdrPerUnit: 4400 },
  { code: "SA", country: "Saudi Arabia", currency: "SAR", symbol: "SAR", flag: "🇸🇦", fallbackIdrPerUnit: 4300 },
];

/** The store's home region; used whenever a visitor's country is unknown or unsupported. */
export const DEFAULT_REGION = STORE_REGIONS[0];

export const SUPPORTED_CURRENCIES = Array.from(new Set(STORE_REGIONS.map(region => region.currency)));

export const findRegion = (countryCode: string | null | undefined): StoreRegion | undefined =>
  STORE_REGIONS.find(region => region.code === countryCode?.toUpperCase());
