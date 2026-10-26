import { z } from "zod";
import { getAppOrigin } from "../_core/security";
import { protectedProcedure, router } from "../_core/trpc";
import { createCryptoInvoice } from "../modules/payments/nowpayments";
import { describeOrderLine, recordOnlinePaymentOrder } from "../modules/orders/orderRequests";
import { cartItemsSchema, priceCart } from "./cart";

/** NOWPayments caps `order_description`; keep the summary well inside it. */
const MAX_DESCRIPTION_LENGTH = 480;

export const nowpaymentsRouter = router({
  createInvoice: protectedProcedure
    .input(
      z.object({
        items: cartItemsSchema,
        customerEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, subtotal } = priceCart(input.items);
      const orderDescription = lines
        .map(line => `${line.quantity}x ${describeOrderLine(line)}`)
        .join(", ")
        .slice(0, MAX_DESCRIPTION_LENGTH);
      const origin = getAppOrigin(ctx.req);
      const orderId = `TR-CRYPTO-${Date.now().toString(36).toUpperCase()}`;
      const customerEmail = input.customerEmail || ctx.user?.email || undefined;

      const invoice = await createCryptoInvoice({
        amount: subtotal,
        orderId,
        orderDescription,
        customerEmail,
        successUrl: `${origin}/order-success?provider=nowpayments&order_id=${orderId}`,
        cancelUrl: `${origin}/shop?checkout_cancelled=true`,
        ipnCallbackUrl: `${origin}/api/nowpayments/webhook`,
      });

      // Mirror into order_requests so it shows up in the admin dashboard and live tracking right away.
      try {
        await recordOnlinePaymentOrder({
          reference: orderId,
          customerName: ctx.user?.name ?? undefined,
          email: customerEmail,
          notes: `NOWPayments Invoice: ${invoice.id}`,
          lines,
          subtotal,
          currency: "IDR",
          status: "new",
        });
      } catch (error) {
        console.warn("[NOWPayments] Failed to pre-record order_request:", error);
      }

      return { invoiceId: invoice.id, orderId: invoice.order_id, invoiceUrl: invoice.invoice_url };
    }),
});
