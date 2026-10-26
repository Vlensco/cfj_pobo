import crypto from "crypto";
import axios from "axios";
import { ENV } from "../../_core/env";
import { safeEqual } from "../../_core/security";
import { convertIdrToUsd } from "./exchangeRate";

const apiKey = process.env.NOWPAYMENTS_API_KEY ?? "";
const isSandbox = process.env.NOWPAYMENTS_ENV !== "production";

const BASE_URL = isSandbox ? "https://api-sandbox.nowpayments.io/v1" : "https://api.nowpayments.io/v1";

export interface CreateCryptoInvoiceParams {
  amount: number; // in IDR
  orderId: string;
  orderDescription: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  ipnCallbackUrl?: string;
}

type CryptoInvoice = {
  id: string;
  order_id: string;
  price_amount: number;
  price_currency: string;
  invoice_url: string;
  created_at: string;
};

/**
 * Creates a NOWPayments Crypto Invoice (accepts USDT, BTC, ETH, SOL, BNB, etc.)
 */
export async function createCryptoInvoice({
  amount,
  orderId,
  orderDescription,
  successUrl,
  cancelUrl,
  ipnCallbackUrl,
}: CreateCryptoInvoiceParams): Promise<CryptoInvoice> {
  if (!apiKey) throw new Error("Crypto payments are not configured.");

  try {
    // NOWPayments requires a global fiat base currency (USD) to estimate BTC/USDT prices
    const usdAmount = await convertIdrToUsd(amount);

    const response = await axios.post<CryptoInvoice>(
      `${BASE_URL}/invoice`,
      {
        price_amount: Math.max(1, usdAmount),
        price_currency: "usd",
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error) {
    const detail = axios.isAxiosError(error) ? error.response?.data : null;
    console.error("[NOWPayments] Failed to create invoice:", detail || error);
    throw new Error(detail?.message || "Failed to create crypto payment invoice via NOWPayments.");
  }
}

/** Recursively sorts object keys, as NOWPayments requires before signing. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map(key => [key, sortKeysDeep(source[key])])
    );
  }
  return value;
}

/**
 * Verifies NOWPayments IPN webhook signature using HMAC-SHA512
 */
export function verifyNowPaymentsSignature(payload: object, signature: string): boolean {
  if (!ENV.nowpaymentsIpnSecret || !signature) return false;

  const expected = crypto
    .createHmac("sha512", ENV.nowpaymentsIpnSecret)
    .update(JSON.stringify(sortKeysDeep(payload)))
    .digest("hex");

  return safeEqual(expected, signature);
}
