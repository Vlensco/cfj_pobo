import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { recordOnlinePaymentOrder } from "../orderRequests";
import {
  createB2BInvoice,
  createBillingPortalSession,
  createStripeCheckoutSession,
  stripe,
} from "../stripe";

export const stripeRouter = router({
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.string(),
            name: z.string(),
            price: z.number().positive(),
            quantity: z.number().int().positive(),
            color: z.string().optional(),
            size: z.string().optional(),
            image: z.string().optional(),
          })
        ),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        currency: z.string().optional(),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const host = ctx.req.headers.origin || input.origin || `http://localhost:${process.env.PORT || 3000}`;
      const successUrl = `${host}/order-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${host}/shop?checkout_cancelled=true`;

      const session = await createStripeCheckoutSession({
        items: input.items,
        currency: input.currency || "idr",
        customerName: input.customerName || ctx.user?.name || undefined,
        customerEmail: input.customerEmail || ctx.user?.email || undefined,
        successUrl,
        cancelUrl,
        metadata: {
          userOpenId: ctx.user?.openId || "guest",
        },
      });

      // Record into order_requests so it appears instantly in the admin dashboard and live tracking
      const subtotal = input.items.reduce((total, item) => total + item.price * item.quantity, 0);
      const reference = `TR-${session.id.slice(-8).toUpperCase()}`;
      try {
        await recordOnlinePaymentOrder({
          reference,
          customerName: input.customerName || ctx.user?.name || undefined,
          email: input.customerEmail || ctx.user?.email || undefined,
          notes: `Stripe Checkout Session: ${session.id}`,
          items: input.items,
          subtotal,
          currency: (input.currency || "IDR").toUpperCase(),
          status: "new",
        });
      } catch (e) {
        console.warn("[Stripe] Failed to pre-record order_request:", e);
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    }),

  getSessionStatus: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["line_items", "customer", "payment_intent"],
      });

      return {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerDetails: session.customer_details,
        amountTotal: session.amount_total,
        currency: session.currency,
        lineItems: session.line_items?.data || [],
        shippingDetails: (session as any).shipping_details || (session as any).collected_information?.shipping_details || null,
      };
    }),

  createCustomerPortal: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        returnUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const host = ctx.req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
      const returnUrl = input.returnUrl || `${host}/shop`;

      const portal = await createBillingPortalSession(input.customerId, returnUrl);
      return { url: portal.url };
    }),

  createInvoice: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        items: z.array(
          z.object({
            description: z.string(),
            amount: z.number().positive(),
            quantity: z.number().int().positive().optional(),
          })
        ),
        daysUntilDue: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const invoice = await createB2BInvoice({
        customerId: input.customerId,
        items: input.items,
        daysUntilDue: input.daysUntilDue,
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.number,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
        status: invoice.status,
        total: invoice.total,
      };
    }),
});
