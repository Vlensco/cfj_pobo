import { randomBytes } from "crypto";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Single source of truth for server configuration.
 * Secrets never have a hardcoded fallback: a missing value disables the
 * feature that depends on it instead of silently using a public default.
 */
export const ENV = {
  isProduction,
  appId: process.env.VITE_APP_ID || "terrace_app",
  /** Public origin of the deployed site, e.g. https://cfjersey.com (no trailing slash). */
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  cookieSecret: process.env.JWT_SECRET ?? "",
  /** Read lazily so scripts that load dotenv after importing this module still work. */
  get databaseUrl() {
    return process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
  },
  adminUsername: (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase(),
  adminEmail: (process.env.ADMIN_EMAIL || "admin@cfjersey.com").trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  wiseApiToken: process.env.WISE_API_TOKEN ?? "",
  wiseEnv: (process.env.WISE_ENV === "production" ? "production" : "sandbox") as "production" | "sandbox",
  /** Optional: the Wise profile that receives payments. Detected from the token when empty. */
  wiseProfileId: Number(process.env.WISE_PROFILE_ID) || 0,
  wiseCurrencies: (process.env.WISE_CURRENCIES || "USD,EUR,GBP")
    .split(",")
    .map(code => code.trim().toUpperCase())
    .filter(code => /^[A-Z]{3}$/.test(code)),
  nowpaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET ?? "",
};

let ephemeralSessionSecret: string | null = null;

/**
 * Returns the key used to sign session cookies.
 * Production refuses to run without JWT_SECRET. Development falls back to a
 * random per-process key, so sessions simply reset when the server restarts.
 */
export function getSessionSecret(): string {
  if (ENV.cookieSecret) return ENV.cookieSecret;
  if (ENV.isProduction) {
    throw new Error("JWT_SECRET is not configured. Sessions are disabled until it is set.");
  }
  if (!ephemeralSessionSecret) {
    ephemeralSessionSecret = randomBytes(32).toString("hex");
    console.warn("[Auth] JWT_SECRET is not set. Using a temporary session key for this process.");
  }
  return ephemeralSessionSecret;
}
