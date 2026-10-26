import Stripe from "stripe";
import { isZeroDecimalCurrency } from "../../../shared/currency";

// The SDK refuses an empty key at construction time, so an unconfigured
// environment gets a placeholder and every API call fails with an auth error.
const secretKey = process.env.STRIPE_SECRET_KEY || "placeholder_stripe_key";

export const stripe = new Stripe(secretKey, {
  typescript: true,
});

export { isZeroDecimalCurrency };

const SHIPPING_COUNTRIES = [
  "ID", "US", "SG", "MY", "GB", "AU", "JP", "CA", "DE", "FR", "IT",
  "ES", "NL", "BE", "CH", "SE", "NO", "DK", "NZ", "KR", "HK", "PH",
  "TH", "VN", "TW", "AE", "SA", "BR", "MX", "IE", "AT", "PT", "FI",
] as const;

export interface CheckoutLineItemInput {
  productId: string;
  name: string;
  price: number; // in IDR (integer amount)
  quantity: number;
  color?: string;
  size?: string;
  image?: string;
}

export interface CreateCheckoutSessionParams {
  items: CheckoutLineItemInput[];
  customerEmail?: string;
  customerName?: string;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a Stripe Checkout Session with dynamic payment methods and multi-currency support.
 * Adheres to Stripe best practices:
 * - Enables Adaptive Pricing (automatic presentment in 135+ local currencies for international buyers)
 * - Omits `payment_method_types` to let Dashboard dynamic payment methods optimize conversion
 * - Collects global shipping & tax ID details
 */
export async function createStripeCheckoutSession({
  items,
  customerEmail,
  customerName,
  currency = "idr",
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutSessionParams) {
  const normalizedCurrency = currency.toLowerCase();
  const isZeroDecimal = isZeroDecimalCurrency(normalizedCurrency);

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => {
    const description = [item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`]
      .filter(Boolean)
      .join(" | ");

    return {
      price_data: {
        currency: normalizedCurrency,
        unit_amount: isZeroDecimal ? Math.round(item.price) : Math.round(item.price * 100),
        product_data: {
          name: item.name,
          description: description || undefined,
          images: item.image?.startsWith("http") ? [item.image] : undefined,
          metadata: {
            productId: item.productId,
            color: item.color || "",
            size: item.size || "",
          },
        },
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    customer_email: customerEmail || undefined,
    billing_address_collection: "auto",
    shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
    adaptive_pricing: { enabled: true },
    tax_id_collection: { enabled: true },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      customerName: customerName || "",
      ...metadata,
    },
  });

  return session;
}

/**
 * Creates a Customer Portal session for billing & payment management
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Generates a B2B / Wholesale invoice
 */
export async function createB2BInvoice({
  customerId,
  items,
  daysUntilDue = 14,
}: {
  customerId: string;
  items: { description: string; amount: number; quantity?: number }[];
  daysUntilDue?: number;
}) {
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(item.amount),
      currency: "idr",
      description: item.description,
      quantity: item.quantity || 1,
    });
  }

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: daysUntilDue,
    auto_advance: true,
  });

  return stripe.invoices.finalizeInvoice(invoice.id);
}
