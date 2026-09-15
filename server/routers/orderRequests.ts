import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { createOrderRequest, getCustomerOrders, getOrderTrackingDetails } from "../orderRequests";
import { publicProcedure, router } from "../_core/trpc";

const requestItem = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(8),
  color: z.string().min(1).max(30),
  size: z.string().min(1).max(30),
});

const requestInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(40),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(requestItem).min(1).max(12),
});

export const orderRequestRouter = router({
  create: publicProcedure.input(requestInput).mutation(async ({ input }) => {
    let created;
    try {
      created = await createOrderRequest(input);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Your request could not be saved.",
      });
    }
    const lineSummary = created.lines.map(line => `${line.quantity}× ${line.name} (${line.color}, ${line.size})`).join("; ");
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

  track: publicProcedure
    .input(
      z.object({
        reference: z.string().trim().min(1, "Order reference is required"),
      })
    )
    .query(async ({ input }) => {
      const details = await getOrderTrackingDetails(input.reference);
      if (!details) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order reference "${input.reference}" was not found. Please check your reference code and try again.`,
        });
      }
      return details;
    }),

  myOrders: publicProcedure
    .input(
      z.object({
        references: z.array(z.string()).optional(),
        email: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const email = input?.email || ctx.user?.email || undefined;
      return getCustomerOrders({ references: input?.references, email });
    }),
});
