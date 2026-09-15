import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { orderLineItems, orderRequests, orders } from "../drizzle/schema";
import { stripe } from "./stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development if no webhook secret is set, parse body safely
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.warn("[Stripe Webhook] Notice: Processing webhook without signature verification (STRIPE_WEBHOOK_SECRET not set).");
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Error constructing event:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Checkout session completed: ${session.id}`);

        // Fulfillment logic: Save order into database
        const db = await getDb();
        if (db) {
          const curr = (session.currency || "IDR").toLowerCase();
          const isZeroDec = ["jpy", "krw", "vnd", "clp", "pyg", "bif", "djf", "gnf", "kmf", "mga", "rwf", "ugx", "vuv", "xaf", "xof", "xpf"].includes(curr);
          const divisor = isZeroDec ? 1 : 100;

          const orderName = `#ST-${session.id.slice(-8).toUpperCase()}`;
          const subtotalNum = session.amount_subtotal ? session.amount_subtotal / divisor : 0;
          const totalNum = session.amount_total ? session.amount_total / divisor : 0;
          const taxesNum = session.total_details?.amount_tax ? session.total_details.amount_tax / divisor : 0;
          const shippingNum = session.total_details?.amount_shipping ? session.total_details.amount_shipping / divisor : 0;

          const shippingInfo = (session as any).shipping_details || (session as any).collected_information?.shipping_details;
          await db.insert(orders).values({
            name: orderName,
            orderId: session.id,
            email: session.customer_details?.email || session.customer_email || "customer@example.com",
            financialStatus: session.payment_status === "paid" ? "paid" : "pending",
            paidAt: session.payment_status === "paid" ? new Date() : null,
            currency: curr.toUpperCase(),
            subtotal: String(subtotalNum),
            shipping: String(shippingNum),
            taxes: String(taxesNum),
            total: String(totalNum),
            paymentMethod: "stripe_checkout",
            paymentReference: session.payment_intent ? String(session.payment_intent) : session.id,
            shippingName: shippingInfo?.name || session.customer_details?.name || null,
            shippingAddress1: shippingInfo?.address?.line1 || null,
            shippingAddress2: shippingInfo?.address?.line2 || null,
            shippingCity: shippingInfo?.address?.city || null,
            shippingProvince: shippingInfo?.address?.state || null,
            shippingCountry: shippingInfo?.address?.country || null,
            shippingZip: shippingInfo?.address?.postal_code || null,
            createdAt: new Date(),
          }).onConflictDoNothing();

          // Also update order_requests if present
          const reference = `TR-${session.id.slice(-8).toUpperCase()}`;
          await db
            .update(orderRequests)
            .set({ status: "contacted", contactedAt: new Date() })
            .where(eq(orderRequests.reference, reference));

          // If line items are expanded
          if (session.line_items?.data) {
            for (const item of session.line_items.data) {
              await db.insert(orderLineItems).values({
                orderName: orderName,
                lineitemName: item.description || "Terrace Item",
                lineitemQuantity: item.quantity || 1,
                lineitemPrice: String(item.amount_total ? (item.amount_total / divisor) / (item.quantity || 1) : 0),
              }).onConflictDoNothing();
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice paid: ${invoice.id} (${invoice.number})`);
        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.warn(`[Stripe Webhook] Invoice payment failed: ${failedInvoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
