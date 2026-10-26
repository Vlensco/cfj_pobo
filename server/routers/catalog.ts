import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { listCatalogAddOns } from "../modules/catalog/csvCatalog";
import { buildOrderRequestLines } from "../modules/orders/orderRequests";
import { cartItemSchema } from "./cart";

export const catalogRouter = router({
  /** Ready-made namesets and sleeve patches, picked by SKU in the shirt personaliser. */
  addOns: publicProcedure
    .input(
      z.object({
        kind: z.enum(["nameset", "patch"]),
        search: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(1500).default(30),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(({ input }) => listCatalogAddOns(input)),

  /**
   * Checks each bag line with the same rules checkout uses, so the bag can
   * point at the line that still needs work (e.g. a custom nameset without
   * its font reference) before the customer tries to pay.
   */
  validateCart: publicProcedure
    .input(z.object({ items: z.array(cartItemSchema).max(12) }))
    .query(({ input }) =>
      input.items.map(item => {
        try {
          buildOrderRequestLines([item]);
          return { error: null };
        } catch (error) {
          return { error: error instanceof Error ? error.message : "This item cannot be ordered." };
        }
      })
    ),
});
