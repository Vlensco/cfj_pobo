import axios from "axios";
import { ENV } from "../../_core/env";

/**
 * Wise has no hosted checkout: customers pay by bank transfer into the shop's
 * Wise account, quoting the order reference. This module reads the account's
 * receiving bank details and Wise's live rate through the Wise API.
 */

const BASE_URLS = {
  sandbox: "https://api.wise-sandbox.com",
  production: "https://api.wise.com",
} as const;

const DETAILS_TTL_MS = 60 * 60 * 1000;

export type WiseBankDetail = { label: string; value: string };
export type WiseReceiveOption = { title: string; details: WiseBankDetail[] };
export type WiseBankAccount = { currency: string; receiveOptions: WiseReceiveOption[] };

type AccountDetailsResponse = Array<{
  currency?: { code?: string };
  receiveOptions?: Array<{
    type?: string;
    title?: string;
    details?: Array<{ type?: string; title?: string; body?: string; hidden?: boolean }>;
  }>;
}>;

let cachedProfileId: number | null = null;
let cachedAccounts: { byCurrency: Map<string, WiseBankAccount>; fetchedAt: number } | null = null;

export function isWiseConfigured(): boolean {
  return Boolean(ENV.wiseApiToken);
}

/** Currencies customers may pay in, limited to the ones the Wise account can receive. */
export function getWiseCurrencies(): string[] {
  return ENV.wiseCurrencies;
}

function wiseClient() {
  if (!ENV.wiseApiToken) throw new Error("Wise is not configured. Set WISE_API_TOKEN on the server.");
  return axios.create({
    baseURL: BASE_URLS[ENV.wiseEnv],
    timeout: 8000,
    headers: { Authorization: `Bearer ${ENV.wiseApiToken}` },
  });
}

async function getProfileId(): Promise<number> {
  if (ENV.wiseProfileId) return ENV.wiseProfileId;
  if (cachedProfileId) return cachedProfileId;

  const { data } = await wiseClient().get<Array<{ id: number; type?: string }>>("/v2/profiles");
  // A business profile is the one that receives shop payments; fall back to the personal one.
  const profile = data.find(item => item.type?.toUpperCase() === "BUSINESS") ?? data[0];
  if (!profile) throw new Error("The Wise API token has no profile.");
  cachedProfileId = profile.id;
  return profile.id;
}

/** Wise masks account details that have not been activated yet (e.g. "8xx00xxxxx"). */
const isMasked = (value: string) => /x{2,}/i.test(value);

async function loadAccounts(): Promise<Map<string, WiseBankAccount>> {
  if (cachedAccounts && Date.now() - cachedAccounts.fetchedAt < DETAILS_TTL_MS) return cachedAccounts.byCurrency;

  const profileId = await getProfileId();
  const { data } = await wiseClient().get<AccountDetailsResponse>(`/v1/profiles/${profileId}/account-details`);

  const byCurrency = new Map<string, WiseBankAccount>();
  for (const account of data) {
    const currency = account.currency?.code?.toUpperCase();
    if (!currency) continue;
    const receiveOptions = (account.receiveOptions ?? [])
      .map(option => ({
        title: option.type === "INTERNATIONAL" ? "International (SWIFT)" : "Local transfer",
        details: (option.details ?? [])
          .filter(detail => !detail.hidden && detail.title && detail.body)
          .map(detail => ({ label: detail.title!, value: detail.body!.trim() })),
      }))
      .filter(option => option.details.length > 0);
    if (receiveOptions.length > 0) byCurrency.set(currency, { currency, receiveOptions });
  }

  cachedAccounts = { byCurrency, fetchedAt: Date.now() };
  return byCurrency;
}

/** Bank details for paying into the shop's Wise account in `currency`. */
export async function getWiseBankAccount(currency: string): Promise<WiseBankAccount & { isSandboxPreview: boolean }> {
  const account = (await loadAccounts()).get(currency.toUpperCase());
  if (!account) throw new Error(`The Wise account cannot receive ${currency} yet.`);

  const hasMaskedValues = account.receiveOptions.some(option => option.details.some(detail => isMasked(detail.value)));
  if (hasMaskedValues && ENV.wiseEnv === "production") {
    throw new Error(`The Wise ${currency} account details are not activated yet. Activate them in Wise first.`);
  }
  return { ...account, isSandboxPreview: ENV.wiseEnv !== "production" };
}

/** Converts a rupiah amount into `currency` with Wise's live mid-market rate, rounded up to the cent. */
export async function convertIdrWithWise(idrAmount: number, currency: string): Promise<{ amount: number; rate: number }> {
  const { data } = await wiseClient().get<Array<{ rate: number }>>("/v1/rates", {
    params: { source: "IDR", target: currency.toUpperCase() },
  });
  const rate = data[0]?.rate;
  if (!rate || rate <= 0) throw new Error(`Wise returned no IDR→${currency} rate.`);
  return { amount: Math.ceil(idrAmount * rate * 100) / 100, rate };
}
