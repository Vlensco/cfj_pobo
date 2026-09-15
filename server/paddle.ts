import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const paddleApiKey = process.env.PADDLE_API_KEY || "placeholder_paddle_key";

const paddleEnv = process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox;

export const paddle = new Paddle(paddleApiKey, {
  environment: paddleEnv,
});

export interface PaddleCheckoutItem {
  name: string;
  price: number; // in IDR
  quantity: number;
  productId?: string;
  color?: string;
  size?: string;
}

export interface CreatePaddleTransactionParams {
  items: PaddleCheckoutItem[];
  customerEmail?: string;
  customerName?: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a Paddle Transaction with non-catalog items (custom price).
 * Paddle automatically presents prices in local currencies and supports Cards, Apple Pay, Google Pay, and PayPal.
 */
import { convertIdrToUsdCents } from "./exchangeRate";

export async function createPaddleTransaction({
  items,
  customerEmail,
  customerName,
  returnUrl,
  metadata = {},
}: CreatePaddleTransactionParams) {
  const transactionItems = await Promise.all(
    items.map(async item => {
      // Convert IDR to real-time USD cents for Paddle global transaction
      const usdCents = await convertIdrToUsdCents(item.price);

      return {
        quantity: item.quantity,
        price: {
          description: `${item.name}${item.color ? ` (${item.color})` : ""}${item.size ? ` - ${item.size}` : ""}`,
          name: item.name,
          taxMode: "internal" as const,
          unitPrice: {
            amount: String(usdCents),
            currencyCode: "USD" as const,
          },
          product: {
            name: item.name,
            taxCategory: "standard" as const,
            description: `${item.name} · TERRACE Storefront`,
          },
        },
      };
    })
  );

  let customerId: string | undefined = undefined;
  if (customerEmail) {
    try {
      const customer = await paddle.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = customer.id;
    } catch {
      // If customer exists or in test mode
    }
  }

  try {
    const transaction = await paddle.transactions.create({
      items: transactionItems,
      customerId: customerId || undefined,
      checkout: returnUrl ? { url: returnUrl } : undefined,
      customData: {
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        ...metadata,
      },
    });

    return transaction;
  } catch (error: any) {
    if (
      error.message?.includes("approved by Paddle") ||
      error.message?.includes("checkout.url") ||
      error.code?.includes("domain")
    ) {
      console.warn("[Paddle] Domain in checkout.url is not approved in dashboard, creating transaction without checkout.url override...");
      const transaction = await paddle.transactions.create({
        items: transactionItems,
        customerId: customerId || undefined,
        customData: {
          customerName: customerName || "",
          customerEmail: customerEmail || "",
          ...metadata,
        },
      });

      return transaction;
    }

    throw error;
  }
}
