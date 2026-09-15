import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const adminProductRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(15),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const [products, total] = await Promise.all([
        db.listDbProducts({
          search: input.search,
          type: input.type,
          limit: input.pageSize,
          offset,
        }),
        db.countDbProducts({
          search: input.search,
          type: input.type,
        }),
      ]);
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      return {
        products,
        total,
        totalPages,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getDetails: publicProcedure
    .input(z.object({ handle: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await db.getDbProductWithDetails(input.handle);
      return product;
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(2, "Product title is required"),
        handle: z.string().min(2, "Handle/Slug is required"),
        bodyHtml: z.string().optional(),
        vendor: z.string().optional(),
        type: z.string().optional(),
        tags: z.string().optional(),
        price: z.string().min(1, "Price is required"),
        imageUrl: z.string().optional(),
        colors: z.array(z.string()).optional(),
        sizes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const created = await db.createAdminProduct(input);
      return { success: true, product: created };
    }),

  update: publicProcedure
    .input(
      z.object({
        handle: z.string().min(1),
        title: z.string().optional(),
        bodyHtml: z.string().optional(),
        type: z.string().optional(),
        tags: z.string().optional(),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { handle, ...data } = input;
      const updated = await db.updateAdminProduct(handle, data);
      return { success: true, product: updated };
    }),

  delete: publicProcedure
    .input(z.object({ handle: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await db.deleteAdminProduct(input.handle);
      return { success: true, product: deleted };
    }),
});
