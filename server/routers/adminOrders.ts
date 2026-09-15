import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { exportOrderRequests, listOrderRequests, updateOrderRequestStatus } from "../db";
import { orderRequestStatuses } from "../adminOrders";
import { getStoreProduct } from "../products";
import { adminProcedure, router } from "../_core/trpc";

const statusSchema = z.enum(orderRequestStatuses);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const productSchema = z.string().refine(value => !value || Boolean(getStoreProduct(value)), "Unknown product filter").optional();

const browseBaseSchema = z.object({
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  productId: productSchema,
  overdueOnly: z.boolean().default(false),
  startDate: dateSchema,
  endDate: dateSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
});

const browseInput = browseBaseSchema
  .refine(input => input.startDate <= input.endDate, { message: "The end date must be on or after the start date." })
  .refine(input => !input.overdueOnly || !input.status || input.status === "new", { message: "Needs follow-up can only be combined with New requests." });

const exportInput = browseBaseSchema
  .pick({ status: true, search: true, productId: true, overdueOnly: true, startDate: true, endDate: true })
  .refine(input => input.startDate <= input.endDate, { message: "The end date must be on or after the start date." })
  .refine(input => !input.overdueOnly || !input.status || input.status === "new", { message: "Needs follow-up can only be combined with New requests." });

export const adminOrderRouter = router({
  list: adminProcedure.input(browseInput).query(async ({ input }) => {
    const result = await listOrderRequests(input);
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order requests are unavailable." });
    return result;
  }),
  exportRows: adminProcedure.input(exportInput).query(async ({ input }) => {
    const orders = await exportOrderRequests(input);
    if (!orders) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order export is unavailable." });
    return orders;
  }),
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusSchema,
        fulfillmentStage: z.string().optional(),
        courierName: z.string().trim().max(120).optional().nullable(),
        trackingNumber: z.string().trim().max(120).optional().nullable(),
        trackingUrl: z.string().trim().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await updateOrderRequestStatus(input.id, input);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Order request not found." });
      return updated;
    }),
  updateShipping: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusSchema.optional(),
        fulfillmentStage: z.string().optional(),
        courierName: z.string().trim().max(120).optional().nullable(),
        trackingNumber: z.string().trim().max(120).optional().nullable(),
        trackingUrl: z.string().trim().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await updateOrderRequestStatus(input.id, input);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Order request not found." });
      return updated;
    }),
});
