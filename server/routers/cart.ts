import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildOrderRequestLines, OrderRequestLineInput, sumOrderLines } from "../modules/orders/orderRequests";

/**
 * One cart line as submitted by the storefront. Any price the client sends is
 * accepted for backwards compatibility but ignored: see `priceCart`.
 */
export const cartItemSchema = z.object({
  productId: z.string().min(1).max(255),
  quantity: z.number().int().min(1).max(8),
  color: z.string().min(1).max(30),
  size: z.string().min(1).max(30),
  customization: z
    .object({
      nameset: z
        .object({
          mode: z.enum(["custom", "ready"]).optional(),
          name: z.string().max(120),
          number: z.string().max(10),
          price: z.number().nonnegative().optional(),
          sku: z.string().max(128).optional(),
          fontReference: z
            .object({
              id: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/),
              fileName: z.string().max(255),
              mimeType: z.string().max(100),
            })
            .optional(),
        })
        .optional(),
      patch: z
        .object({
          sku: z.string().max(128),
          name: z.string().max(120).optional(),
          price: z.number().nonnegative().optional(),
          competition: z.string().max(60).optional(),
        })
        .optional(),
      itemNote: z.string().max(500).optional(),
    })
    .optional(),
});

export const cartItemsSchema = z.array(cartItemSchema).min(1).max(12);

/** Prices a cart from the server catalog so checkout totals cannot be set by the client. */
export function priceCart(items: OrderRequestLineInput[]) {
  try {
    const lines = buildOrderRequestLines(items);
    return { lines, subtotal: sumOrderLines(lines) };
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Your bag could not be priced.",
    });
  }
}
