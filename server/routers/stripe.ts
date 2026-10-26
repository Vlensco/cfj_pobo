import { z } from "zod";
import { getAppOrigin } from "../_core/security";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { describeOrderLine, recordOnlinePaymentOrder } from "../modules/orders/orderRequests";
import { createB2BInvoice, createBillingPortalSession, createStripeCheckoutSession, stripe } from "../modules/payments/stripe";
import { cartItemsSchema, priceCart } from "./cart";

const stripeCustomerId = z.string().regex(/^cus_[A-Za-z0-9]+$/, "Invalid Stripe customer id");

export const stripeRouter = router({
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        items: cartItemsSchema,
        customerName: z.string().trim().max(120).optional(),
        customerEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, subtotal } = priceCart(input.items);
      const items = lines.map(line => ({
        productId: line.productId,
        name: describeOrderLine(line),
        price: line.unitAmount,
        quantity: line.quantity,
        color: line.color,
        size: line.size,
      }));
      const origin = getAppOrigin(ctx.req);
      const customerName = input.customerName || ctx.user?.name || undefined;
      const customerEmail = input.customerEmail || ctx.user?.email || undefined;

      const session = await createStripeCheckoutSession({
        items,
        currency: "idr",
        customerName,
        customerEmail,
        successUrl: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/shop?checkout_cancelled=true`,
        metadata: { userOpenId: ctx.user?.openId || "guest" },
      });

      // Mirror into order_requests so it shows up in the admin dashboard and live tracking right away.
      try {
        await recordOnlinePaymentOrder({
          reference: `TR-${session.id.slice(-8).toUpperCase()}`,
          customerName,
          email: customerEmail,
          notes: `Stripe Checkout Session: ${session.id}`,
          items,
          subtotal,
          currency: "IDR",
          status: "new",
        });
      } catch (error) {
        console.warn("[Stripe] Failed to pre-record order_request:", error);
      }

      return { url: session.url, sessionId: session.id };
    }),

  getSessionStatus: publicProcedure.input(z.object({ sessionId: z.string().min(1).max(255) })).query(async ({ input }) => {
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
      shippingDetails: session.collected_information?.shipping_details ?? null,
    };
  }),

  // Billing portal and invoicing act on an arbitrary Stripe customer, so they are staff-only.
  createCustomerPortal: adminProcedure
    .input(z.object({ customerId: stripeCustomerId }))
    .mutation(async ({ ctx, input }) => {
      const portal = await createBillingPortalSession(input.customerId, `${getAppOrigin(ctx.req)}/shop`);
      return { url: portal.url };
    }),

  createInvoice: adminProcedure
    .input(
      z.object({
        customerId: stripeCustomerId,
        items: z
          .array(
            z.object({
              description: z.string().min(1).max(500),
              amount: z.number().positive(),
              quantity: z.number().int().positive().optional(),
            })
          )
          .min(1)
          .max(50),
        daysUntilDue: z.number().int().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const invoice = await createB2BInvoice(input);
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
