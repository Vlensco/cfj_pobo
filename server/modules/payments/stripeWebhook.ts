import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { orderLineItems, orderRequests, orders } from "../../../drizzle/schema";
import { ENV } from "../../_core/env";
import { assertUnsignedWebhookAllowed, readJsonBody, readRawBody, WebhookRejectedError } from "../../_core/webhooks";
import { isZeroDecimalCurrency, stripe } from "./stripe";

function parseStripeEvent(req: Request): Stripe.Event {
  if (!ENV.stripeWebhookSecret) {
    assertUnsignedWebhookAllowed("Stripe", "STRIPE_WEBHOOK_SECRET");
    return readJsonBody<Stripe.Event>(req);
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") throw new WebhookRejectedError("Missing stripe-signature header.");
  return stripe.webhooks.constructEvent(readRawBody(req), signature, ENV.stripeWebhookSecret);
}

/** Saves a paid Checkout Session as an order and marks the matching order request as paid. */
async function recordCheckoutSession(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) return;

  const currency = (session.currency || "IDR").toLowerCase();
  const divisor = isZeroDecimalCurrency(currency) ? 1 : 100;
  const toMajorUnits = (amount: number | null | undefined) => String(amount ? amount / divisor : 0);

  const shortId = session.id.slice(-8).toUpperCase();
  const orderName = `#ST-${shortId}`;
  const isPaid = session.payment_status === "paid";
  const shipping = session.collected_information?.shipping_details;

  await db
    .insert(orders)
    .values({
      name: orderName,
      orderId: session.id,
      email: session.customer_details?.email || session.customer_email || "customer@example.com",
      financialStatus: isPaid ? "paid" : "pending",
      paidAt: isPaid ? new Date() : null,
      currency: currency.toUpperCase(),
      subtotal: toMajorUnits(session.amount_subtotal),
      shipping: toMajorUnits(session.total_details?.amount_shipping),
      taxes: toMajorUnits(session.total_details?.amount_tax),
      total: toMajorUnits(session.amount_total),
      paymentMethod: "stripe_checkout",
      paymentReference: session.payment_intent ? String(session.payment_intent) : session.id,
      shippingName: shipping?.name || session.customer_details?.name || null,
      shippingAddress1: shipping?.address?.line1 || null,
      shippingAddress2: shipping?.address?.line2 || null,
      shippingCity: shipping?.address?.city || null,
      shippingProvince: shipping?.address?.state || null,
      shippingCountry: shipping?.address?.country || null,
      shippingZip: shipping?.address?.postal_code || null,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .update(orderRequests)
    .set({ status: "contacted", contactedAt: new Date() })
    .where(eq(orderRequests.reference, `TR-${shortId}`));

  // Line items are only present when the event was sent with `line_items` expanded.
  for (const item of session.line_items?.data ?? []) {
    const quantity = item.quantity || 1;
    await db
      .insert(orderLineItems)
      .values({
        orderName,
        lineitemName: item.description || "Terrace Item",
        lineitemQuantity: quantity,
        lineitemPrice: String(item.amount_total ? item.amount_total / divisor / quantity : 0),
      })
      .onConflictDoNothing();
  }
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  let event: Stripe.Event;
  try {
    event = parseStripeEvent(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    console.error("[Stripe Webhook] Rejected:", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await recordCheckoutSession(event.data.object);
        break;
      case "invoice.payment_failed":
        console.warn(`[Stripe Webhook] Invoice payment failed: ${event.data.object.id}`);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
