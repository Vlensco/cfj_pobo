import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { recordOnlinePaymentOrder } from "../orderRequests";
import { createCryptoInvoice } from "../nowpayments";

export const nowpaymentsRouter = router({
  createInvoice: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        orderDescription: z.string().optional(),
        customerEmail: z.string().email().optional(),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const host = ctx.req.headers.origin || input.origin || `http://localhost:${process.env.PORT || 3000}`;
      const orderId = `TR-CRYPTO-${Date.now().toString(36).toUpperCase()}`;
      const successUrl = `${host}/order-success?provider=nowpayments&order_id=${orderId}`;
      const cancelUrl = `${host}/shop?checkout_cancelled=true`;
      const ipnCallbackUrl = `${host}/api/nowpayments/webhook`;

      const invoice = await createCryptoInvoice({
        amount: Math.round(input.amount),
        orderId,
        orderDescription: input.orderDescription || "TERRACE Football Culture Apparel",
        customerEmail: input.customerEmail || ctx.user?.email || undefined,
        successUrl,
        cancelUrl,
        ipnCallbackUrl,
      });

      try {
        await recordOnlinePaymentOrder({
          reference: orderId,
          customerName: ctx.user?.name ?? undefined,
          email: input.customerEmail || ctx.user?.email || undefined,
          notes: `NOWPayments Invoice: ${invoice.id}`,
          items: [{ name: input.orderDescription || "Terrace Football Culture Apparel", quantity: 1, price: Math.round(input.amount) }],
          subtotal: Math.round(input.amount),
          currency: "IDR",
          status: "new",
        });
      } catch (e) {
        console.warn("[NOWPayments] Failed to pre-record order_request:", e);
      }

      return {
        invoiceId: invoice.id,
        orderId: invoice.order_id,
        invoiceUrl: invoice.invoice_url,
      };
    }),
});
