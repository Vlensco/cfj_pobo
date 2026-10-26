import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const analyticsEventTypes = ["add_to_bag", "view"] as const;

export const analyticsRouter = router({
  trackEvent: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1).max(128),
        productName: z.string().min(1).max(255),
        eventType: z.enum(analyticsEventTypes).default("add_to_bag"),
        color: z.string().max(64).optional(),
        size: z.string().max(32).optional(),
        price: z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().nonnegative()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const event = await db.recordProductEvent({
        productId: input.productId,
        productName: input.productName,
        eventType: input.eventType,
        color: input.color || null,
        size: input.size || null,
        price: input.price !== undefined ? String(input.price) : "0.00",
      });
      return { success: true, event };
    }),

  getStats: adminProcedure.query(() => db.getProductAnalyticsStats()),
});
