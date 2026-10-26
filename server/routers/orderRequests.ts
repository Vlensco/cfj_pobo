import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { isSelfDeclaredCustomer } from "../_core/sdk";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createOrderRequest, getCustomerOrders, getOrderTrackingDetails } from "../modules/orders/orderRequests";
import { cartItemsSchema } from "./cart";

const referenceSchema = z.string().trim().min(1, "Order reference is required").max(64);

const requestInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(40),
  notes: z.string().trim().max(2000).optional(),
  items: cartItemsSchema,
});

export const orderRequestRouter = router({
  create: protectedProcedure.input(requestInput).mutation(async ({ ctx, input }) => {
    let created;
    try {
      created = await createOrderRequest({ ...input, userOpenId: ctx.user?.openId });
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Your request could not be saved.",
      });
    }

    const lineSummary = created.lines
      .map(line => `${line.quantity}× ${line.name} (${line.color}, ${line.size})`)
      .join("; ");
    try {
      await notifyOwner({
        title: `New TERRACE order request ${created.reference}`,
        content: `${input.customerName} · ${input.email} · ${input.phone}\n${lineSummary}\nSubtotal: IDR ${created.subtotal.toLocaleString("id-ID")}${input.notes ? `\nNotes: ${input.notes}` : ""}`,
      });
    } catch (error) {
      console.warn("[Order request] Owner notification failed", error);
    }

    return { reference: created.reference, subtotal: created.subtotal };
  }),

  track: publicProcedure.input(z.object({ reference: referenceSchema })).query(async ({ input }) => {
    const details = await getOrderTrackingDetails(input.reference);
    if (!details) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Order reference "${input.reference}" was not found. Please check your reference code and try again.`,
      });
    }
    return details;
  }),

  /** Order history of the signed-in account. Visitors who are not signed in get nothing. */
  myOrders: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    // Customer accounts use an unverified email, so they only see orders the
    // account itself placed. A proven email (OAuth sign-in) also matches by email.
    const verifiedEmail = !isSelfDeclaredCustomer(ctx.user) ? ctx.user.email : null;
    return getCustomerOrders({ userOpenId: ctx.user.openId, verifiedEmail });
  }),
});
