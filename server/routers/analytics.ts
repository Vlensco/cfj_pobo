import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  trackEvent: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        eventType: z.string().default("add_to_bag"),
        color: z.string().optional(),
        size: z.string().optional(),
        price: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const priceStr = input.price !== undefined ? String(input.price) : "0.00";
      const event = await db.recordProductEvent({
        productId: input.productId,
        productName: input.productName,
        eventType: input.eventType,
        color: input.color || null,
        size: input.size || null,
        price: priceStr,
      });
      return { success: true, event };
    }),

  getStats: publicProcedure.query(async () => {
    const stats = await db.getProductAnalyticsStats();
    return stats;
  }),
});
