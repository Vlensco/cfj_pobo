import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { orderRequests, orders } from "../../../drizzle/schema";
import { ENV } from "../../_core/env";
import { assertUnsignedWebhookAllowed, readJsonBody, WebhookRejectedError } from "../../_core/webhooks";
import { verifyNowPaymentsSignature } from "./nowpayments";

type NowPaymentsIpn = {
  payment_id?: string | number;
  payment_status?: string;
  order_id?: string;
  pay_amount?: string | number;
  pay_currency?: string;
  price_amount?: string | number;
  price_currency?: string;
  customer_email?: string;
};

const PAID_STATUSES = new Set(["finished", "confirmed", "sending"]);

function verifyIpn(req: Request, payload: NowPaymentsIpn): void {
  if (!ENV.nowpaymentsIpnSecret) {
    assertUnsignedWebhookAllowed("NOWPayments", "NOWPAYMENTS_IPN_SECRET");
    return;
  }

  const signature = req.headers["x-nowpayments-sig"];
  if (typeof signature !== "string" || !verifyNowPaymentsSignature(payload, signature)) {
    throw new WebhookRejectedError("Invalid NOWPayments signature.");
  }
}

/** Saves a confirmed crypto payment as an order and marks the matching order request as paid. */
async function recordPaidInvoice(payload: NowPaymentsIpn, orderId: string) {
  const db = await getDb();
  if (!db) return;

  const paymentId = String(payload.payment_id ?? "");
  const amount = String(payload.price_amount ?? "0");

  await db
    .insert(orders)
    .values({
      name: orderId.startsWith("#") ? orderId : `#${orderId}`,
      orderId: paymentId || orderId,
      email: payload.customer_email || "crypto-customer@terrace.example",
      financialStatus: "paid",
      paidAt: new Date(),
      currency: (payload.price_currency || "IDR").toUpperCase(),
      subtotal: amount,
      total: amount,
      paymentMethod: `crypto_${payload.pay_currency || "usdt"}`,
      paymentReference: paymentId,
      notes: `Paid with ${payload.pay_amount} ${payload.pay_currency?.toUpperCase()}`,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .update(orderRequests)
    .set({ status: "contacted", contactedAt: new Date() })
    .where(eq(orderRequests.reference, orderId));
}

export async function nowpaymentsWebhookHandler(req: Request, res: Response) {
  let payload: NowPaymentsIpn;
  try {
    payload = readJsonBody<NowPaymentsIpn>(req);
    verifyIpn(req, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    console.warn("[NOWPayments IPN] Rejected:", message);
    res.status(400).json({ error: message });
    return;
  }

  try {
    if (payload.order_id && payload.payment_status && PAID_STATUSES.has(payload.payment_status)) {
      await recordPaidInvoice(payload, payload.order_id);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("[NOWPayments IPN] Processing error:", error);
    res.status(500).json({ error: "NOWPayments IPN processing failed" });
  }
}
