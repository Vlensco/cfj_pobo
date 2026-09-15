import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { orderRequests, orders } from "../drizzle/schema";
import { verifyNowPaymentsSignature } from "./nowpayments";

export async function nowpaymentsWebhookHandler(req: Request, res: Response) {
  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const signature = req.headers["x-nowpayments-sig"] as string;

    if (signature && !verifyNowPaymentsSignature(payload, signature)) {
      console.warn("[NOWPayments IPN] Invalid signature received.");
      res.status(400).send("Invalid signature");
      return;
    }

    const { payment_status, order_id, pay_amount, pay_currency, price_amount, price_currency } = payload;
    console.log(`[NOWPayments IPN] Payment status for order ${order_id}: ${payment_status}`);

    if (payment_status === "finished" || payment_status === "confirmed" || payment_status === "sending") {
      const db = await getDb();
      if (db && order_id) {
        const orderName = order_id.startsWith("#") ? order_id : `#${order_id}`;

        await db.insert(orders).values({
          name: orderName,
          orderId: String(payload.payment_id || order_id),
          email: payload.customer_email || "crypto-customer@terrace.example",
          financialStatus: "paid",
          paidAt: new Date(),
          currency: (price_currency || "IDR").toUpperCase(),
          subtotal: String(price_amount || "0"),
          total: String(price_amount || "0"),
          paymentMethod: `crypto_${pay_currency || "usdt"}`,
          paymentReference: String(payload.payment_id || ""),
          notes: `Paid with ${pay_amount} ${pay_currency?.toUpperCase()}`,
          createdAt: new Date(),
        }).onConflictDoNothing();

        // Also update order_requests if present
        await db
          .update(orderRequests)
          .set({ status: "contacted", contactedAt: new Date() })
          .where(eq(orderRequests.reference, order_id));
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[NOWPayments IPN] Processing error:", error);
    res.status(500).json({ error: "NOWPayments IPN processing failed" });
  }
}
