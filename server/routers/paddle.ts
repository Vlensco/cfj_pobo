import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { recordOnlinePaymentOrder } from "../orderRequests";
import { createPaddleTransaction } from "../paddle";

export const paddleRouter = router({
  createTransaction: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            name: z.string(),
            price: z.number().positive(),
            quantity: z.number().int().positive(),
            color: z.string().optional(),
            size: z.string().optional(),
          })
        ),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const host = ctx.req.headers.origin || input.origin || `http://localhost:${process.env.PORT || 3000}`;
      const returnUrl = `${host}/order-success?provider=paddle`;

      const transaction = await createPaddleTransaction({
        items: input.items,
        customerName: input.customerName || ctx.user?.name || undefined,
        customerEmail: input.customerEmail || ctx.user?.email || undefined,
        returnUrl,
        metadata: {
          userOpenId: ctx.user?.openId || "guest",
        },
      });

      const isProd = process.env.PADDLE_ENV === "production";
      const paddleDirectUrl = isProd
        ? `https://buy.paddle.com/checkout?_ptxn=${transaction.id}`
        : `https://sandbox-buy.paddle.com/checkout?_ptxn=${transaction.id}`;

      const checkoutUrl =
        (transaction as any).checkout?.url && !(transaction as any).checkout?.url.includes("localhost")
          ? (transaction as any).checkout.url
          : paddleDirectUrl;

      // Pre-record in order_requests for instant dashboard & customer tracking visibility
      const subtotal = input.items.reduce((total, item) => total + item.price * item.quantity, 0);
      const reference = `TR-PD-${transaction.id.slice(-6).toUpperCase()}`;
      try {
        await recordOnlinePaymentOrder({
          reference,
          customerName: input.customerName || ctx.user?.name || undefined,
          email: input.customerEmail || ctx.user?.email || undefined,
          notes: `Paddle Transaction: ${transaction.id}`,
          items: input.items,
          subtotal,
          currency: "IDR",
          status: "new",
        });
      } catch (e) {
        console.warn("[Paddle] Failed to pre-record order_request:", e);
      }

      return {
        transactionId: transaction.id,
        status: transaction.status,
        checkoutUrl,
      };
    }),
});
