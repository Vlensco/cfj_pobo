import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { exportOrderRequests, listOrderRequests, updateOrderRequestStatus, type UpdateOrderRequestInput } from "../db";
import { orderRequestStatuses } from "../modules/orders/adminOrders";
import { getStoreProduct } from "../modules/catalog/products";
import { adminProcedure, router } from "../_core/trpc";

type DateRange = { startDate: string; endDate: string };
type FollowUpScope = { overdueOnly?: boolean; status?: string };

const statusSchema = z.enum(orderRequestStatuses);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const productSchema = z
  .string()
  .refine(value => !value || Boolean(getStoreProduct(value)), "Unknown product filter")
  .optional();

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).optional().nullable();
/** Shown to customers as a link, so only http(s) is allowed. An empty value clears it. */
const trackingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(value => value === "" || /^https?:\/\//i.test(value), "Tracking URL must start with http:// or https://")
  .transform(value => value || null)
  .optional()
  .nullable();

const isValidDateRange = (input: DateRange) => input.startDate <= input.endDate;
const isValidFollowUpScope = (input: FollowUpScope) => !input.overdueOnly || !input.status || input.status === "new";
const DATE_RANGE_ERROR = { message: "The end date must be on or after the start date." };
const FOLLOW_UP_ERROR = { message: "Needs follow-up can only be combined with New requests." };

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

const browseInput = browseBaseSchema.refine(isValidDateRange, DATE_RANGE_ERROR).refine(isValidFollowUpScope, FOLLOW_UP_ERROR);

const exportInput = browseBaseSchema
  .omit({ page: true, pageSize: true })
  .refine(isValidDateRange, DATE_RANGE_ERROR)
  .refine(isValidFollowUpScope, FOLLOW_UP_ERROR);

const shippingFields = {
  fulfillmentStage: z.string().trim().max(32).optional(),
  courierName: optionalText(120),
  trackingNumber: optionalText(120),
  trackingUrl: trackingUrlSchema,
};

const emptyOrderPage = (page: number, pageSize: number) => ({
  orders: [],
  total: 0,
  page,
  pageSize,
  totalPages: 1,
  summary: {
    new: { count: 0, amount: 0, change: 0 },
    contacted: { count: 0, amount: 0, change: 0 },
    closed: { count: 0, amount: 0, change: 0 },
    comparisonLabel: "previous period",
  },
  trend: [],
  overdueCount: 0,
  topProducts: [],
});

async function applyOrderUpdate({ id, ...fields }: { id: number } & UpdateOrderRequestInput) {
  const updated = await updateOrderRequestStatus(id, fields);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Order request not found." });
  return updated;
}

export const adminOrderRouter = router({
  list: adminProcedure.input(browseInput).query(async ({ input }) => {
    try {
      const result = await listOrderRequests(input);
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order requests are unavailable." });
      return result;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.warn("[AdminOrders] list query failed, returning an empty page:", error);
      return emptyOrderPage(input.page, input.pageSize);
    }
  }),

  exportRows: adminProcedure.input(exportInput).query(async ({ input }) => {
    try {
      const orders = await exportOrderRequests(input);
      if (!orders) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order export is unavailable." });
      return orders;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.warn("[AdminOrders] export query failed:", error);
      return [];
    }
  }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: statusSchema, ...shippingFields }))
    .mutation(({ input }) => applyOrderUpdate(input)),

  updateShipping: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: statusSchema.optional(), ...shippingFields }))
    .mutation(({ input }) => applyOrderUpdate(input)),
});
