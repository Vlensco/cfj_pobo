import crypto from "crypto";
import axios from "axios";

const apiKey = process.env.NOWPAYMENTS_API_KEY || "placeholder_nowpayments_key";
const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || "placeholder_nowpayments_secret";
const isSandbox = process.env.NOWPAYMENTS_ENV !== "production";

const BASE_URL = isSandbox
  ? "https://api-sandbox.nowpayments.io/v1"
  : "https://api.nowpayments.io/v1";

export interface CreateCryptoInvoiceParams {
  amount: number; // in IDR
  orderId: string;
  orderDescription: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  ipnCallbackUrl?: string;
}

/**
 * Creates a NOWPayments Crypto Invoice (accepts USDT, BTC, ETH, SOL, BNB, etc.)
 */
import { convertIdrToUsd } from "./exchangeRate";

export async function createCryptoInvoice({
  amount,
  orderId,
  orderDescription,
  successUrl,
  cancelUrl,
  ipnCallbackUrl,
}: CreateCryptoInvoiceParams) {
  try {
    // NOWPayments requires a global fiat base currency (USD) to estimate BTC/USDT prices
    const usdAmount = await convertIdrToUsd(amount);

    const response = await axios.post(
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
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data as {
      id: string;
      order_id: string;
      price_amount: number;
      price_currency: string;
      invoice_url: string;
      created_at: string;
    };
  } catch (error: any) {
    console.error("[NOWPayments] Failed to create invoice:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to create crypto payment invoice via NOWPayments."
    );
  }
}

/**
 * Verifies NOWPayments IPN webhook signature using HMAC-SHA512
 */
export function verifyNowPaymentsSignature(payload: Record<string, any>, signature: string): boolean {
  if (!ipnSecret || !signature) return false;

  // Sort payload keys alphabetically as required by NOWPayments specification
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = payload[key];
  }

  const hmac = crypto.createHmac("sha512", ipnSecret);
  hmac.update(JSON.stringify(sortedObj));
  const expectedSig = hmac.digest("hex");

  return expectedSig === signature;
}
