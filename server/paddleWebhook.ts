import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { orderLineItems, orderRequests, orders } from "../drizzle/schema";

export async function paddleWebhookHandler(req: Request, res: Response) {
  try {
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event.event_type;

    console.log(`[Paddle Webhook] Received event: ${eventType}`);

    if (eventType === "transaction.completed" || eventType === "transaction.paid") {
      const data = event.data;
      const transactionId = data.id;
      const db = await getDb();

      if (db) {
        const orderName = `#PD-${transactionId.slice(-8).toUpperCase()}`;
        const totalNum = data.details?.totals?.grand_total ? Number(data.details.totals.grand_total) : 0;
        const subtotalNum = data.details?.totals?.subtotal ? Number(data.details.totals.subtotal) : totalNum;
        const taxNum = data.details?.totals?.tax ? Number(data.details.totals.tax) : 0;

        await db.insert(orders).values({
          name: orderName,
          orderId: transactionId,
          email: data.customer?.email || "customer@example.com",
          financialStatus: "paid",
          paidAt: new Date(),
          currency: (data.currency_code || "IDR").toUpperCase(),
          subtotal: String(subtotalNum),
          shipping: "0",
          taxes: String(taxNum),
          total: String(totalNum),
          paymentMethod: "paddle_billing",
          paymentReference: transactionId,
          shippingName: data.customer?.name || null,
          createdAt: new Date(),
        }).onConflictDoNothing();

        // Also update order_requests if present
        const reference = `TR-PD-${transactionId.slice(-6).toUpperCase()}`;
        await db
          .update(orderRequests)
          .set({ status: "contacted", contactedAt: new Date() })
          .where(eq(orderRequests.reference, reference));

        // Line items
        if (data.items?.length) {
          for (const item of data.items) {
            await db.insert(orderLineItems).values({
              orderName: orderName,
              lineitemName: item.price?.description || item.price?.name || "Terrace Item",
              lineitemQuantity: item.quantity || 1,
              lineitemPrice: String(item.price?.unit_price?.amount || "0"),
            }).onConflictDoNothing();
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Paddle Webhook] Error:", error);
    res.status(500).json({ error: "Paddle webhook failed" });
  }
}
