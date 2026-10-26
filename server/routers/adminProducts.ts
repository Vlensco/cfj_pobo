import { z } from "zod";
import * as db from "../db";
import { getCsvCategories } from "../modules/catalog/csvCatalog";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const handleSchema = z.string().trim().min(1).max(255);
const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Price must be a positive number");
/** An absolute http(s) URL or a site-relative path. Rejects `javascript:` and similar schemes. */
const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(value => value === "" || /^(https?:\/\/|\/(?!\/))/i.test(value), "Image must be an http(s) URL or a site path");

const listInput = z
  .object({
    search: z.string().trim().max(100).optional(),
    type: z.string().trim().max(255).optional(),
    /** Only honoured for admins; everyone else always gets the active catalog. */
    status: z.enum(["all", "active", "inactive"]).optional(),
    page: z.number().int().min(1).default(1),
    // The storefront Shop page loads the whole catalog in one request and filters client-side.
    pageSize: z.number().int().min(1).max(2500).default(15),
  })
  .default({ page: 1, pageSize: 15 });

const productFields = {
  title: z.string().trim().min(2, "Product title is required").max(255),
  bodyHtml: z.string().max(20000).optional(),
  type: z.string().trim().max(255).optional(),
  tags: z.string().max(2000).optional(),
  imageUrl: imageUrlSchema.optional(),
};

/**
 * Catalog endpoints. Reads are public because the storefront renders from
 * them; every write requires an admin session.
 */
export const adminProductRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input, ctx }) => {
    const { search, type, page, pageSize } = input;
    const visibility = ctx.user?.role === "admin" ? (input.status ?? "active") : "active";
    try {
      const [products, total] = await Promise.all([
        db.listDbProducts({ search, type, visibility, limit: pageSize, offset: (page - 1) * pageSize }),
        db.countDbProducts({ search, type, visibility }),
      ]);
      return { products, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), page, pageSize };
    } catch (error) {
      console.warn("[AdminProducts] list error:", error);
      return { products: [], total: 0, totalPages: 1, page, pageSize };
    }
  }),

  getDetails: publicProcedure.input(z.object({ handle: handleSchema })).query(async ({ input, ctx }) => {
    try {
      return await db.getDbProductWithDetails(input.handle, { activeOnly: ctx.user?.role !== "admin" });
    } catch (error) {
      console.warn("[AdminProducts] getDetails error:", error);
      return null;
    }
  }),

  categories: publicProcedure.query(() => getCsvCategories()),

  statusCounts: adminProcedure
    .input(z.object({ search: z.string().trim().max(100).optional() }).default({}))
    .query(({ input }) => db.countDbProductsByVisibility(input)),

  setActive: adminProcedure
    .input(z.object({ handle: handleSchema, active: z.boolean() }))
    .mutation(async ({ input }) => {
      const updated = await db.setAdminProductActive(input.handle, input.active);
      return { success: true, product: updated };
    }),

  create: adminProcedure
    .input(
      z.object({
        ...productFields,
        handle: handleSchema.regex(
          /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
          "Handle may only contain letters, numbers, dashes, and underscores"
        ),
        vendor: z.string().trim().max(255).optional(),
        price: priceSchema,
        colors: z.array(z.string().max(60)).max(20).optional(),
        sizes: z.array(z.string().max(60)).max(20).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const created = await db.createAdminProduct(input);
      return { success: true, product: created };
    }),

  update: adminProcedure
    .input(
      z.object({
        ...productFields,
        title: productFields.title.optional(),
        handle: handleSchema,
        price: priceSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { handle, ...data } = input;
      const updated = await db.updateAdminProduct(handle, data);
      return { success: true, product: updated };
    }),

  delete: adminProcedure.input(z.object({ handle: handleSchema })).mutation(async ({ input }) => {
    const deleted = await db.deleteAdminProduct(input.handle);
    return { success: true, product: deleted };
  }),
});
