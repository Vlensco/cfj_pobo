import { and, count, desc, eq, gte, ilike, like, lte, or, sql } from "drizzle-orm";
import { InsertOrderRequest, orderRequests } from "../../drizzle/schema";
import { calculatePercentChange, getComparisonWindows } from "../modules/orders/adminMetrics";
import { OrderRequestStatus } from "../modules/orders/adminOrders";
import { getOverdueCutoff, rankRequestedProducts } from "../modules/followUp/followUpMonitoring";
import { getDb } from "./client";

type OrderQuery = {
  status?: OrderRequestStatus;
  search?: string;
  productId?: string;
  overdueOnly?: boolean;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
};
type OrderScope = Pick<OrderQuery, "status" | "search" | "productId" | "overdueOnly" | "startDate" | "endDate">;
type SummaryScope = Pick<OrderQuery, "search" | "productId" | "startDate" | "endDate">;
type StatusTotals = { count: number; amount: number };
type ComparisonSummary = StatusTotals & { change: number | null };

// -------------------------------------------------------------
// Order requests (admin dashboard)
// -------------------------------------------------------------

function dateStart(date: string) {
  return new Date(`${date}T00:00:00.000+07:00`);
}
function dateEnd(date: string) {
  return new Date(`${date}T23:59:59.999+07:00`);
}

function buildOrderConditions({ status, search, productId, overdueOnly, startDate, endDate }: OrderScope) {
  const conditions = [];
  if (overdueOnly) {
    conditions.push(eq(orderRequests.status, "new"), lte(orderRequests.createdAt, getOverdueCutoff()));
  } else {
    if (status) conditions.push(eq(orderRequests.status, status));
    conditions.push(gte(orderRequests.createdAt, dateStart(startDate)), lte(orderRequests.createdAt, dateEnd(endDate)));
  }
  const keyword = search?.trim();
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(or(ilike(orderRequests.customerName, pattern), ilike(orderRequests.reference, pattern)));
  }
  if (productId) {
    conditions.push(like(orderRequests.items, `%"productId":"${productId}"%`));
  }
  return and(...conditions);
}

async function scopedTotals(status: OrderRequestStatus, scope: SummaryScope): Promise<StatusTotals | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ total: count(), amount: sql<number>`COALESCE(SUM(${orderRequests.subtotal}), 0)` })
    .from(orderRequests)
    .where(buildOrderConditions({ ...scope, status }));
  return { count: Number(result[0]?.total ?? 0), amount: Number(result[0]?.amount ?? 0) };
}

async function getOrderRequestSummary(scope: SummaryScope) {
  const [newSummary, contacted, closed] = await Promise.all([
    scopedTotals("new", scope),
    scopedTotals("contacted", scope),
    scopedTotals("closed", scope),
  ]);
  if (!newSummary || !contacted || !closed) return null;
  return { new: newSummary, contacted, closed };
}

async function getOrderRequestTrend(scope: OrderScope) {
  const db = await getDb();
  if (!db) return null;
  const day = sql<string>`TO_CHAR(${orderRequests.createdAt}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day, total: count() })
    .from(orderRequests)
    .where(buildOrderConditions(scope))
    .groupBy(day)
    .orderBy(day)
    .limit(120);
  return rows.map(row => ({ day: row.day, total: Number(row.total) }));
}

async function getSummaryWithComparison(scope: SummaryScope) {
  const periods = getComparisonWindows(scope.startDate, scope.endDate);
  const [current, previous] = await Promise.all([
    getOrderRequestSummary(scope),
    getOrderRequestSummary({ ...scope, startDate: periods.previous.startDate, endDate: periods.previous.endDate }),
  ]);
  if (!current || !previous) return null;
  const withChange = (status: OrderRequestStatus): ComparisonSummary => ({
    ...current[status],
    change: calculatePercentChange(current[status].count, previous[status].count),
  });
  return {
    new: withChange("new"),
    contacted: withChange("contacted"),
    closed: withChange("closed"),
    comparisonLabel: periods.previous.label,
  };
}

export async function countOverdueOrderRequests() {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ total: count() })
    .from(orderRequests)
    .where(and(eq(orderRequests.status, "new"), lte(orderRequests.createdAt, getOverdueCutoff())));
  return Number(result[0]?.total ?? 0);
}

async function getProductPopularity(scope: OrderScope) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ items: orderRequests.items })
    .from(orderRequests)
    .where(buildOrderConditions(scope))
    .orderBy(desc(orderRequests.createdAt))
    .limit(1000);
  return rankRequestedProducts(rows.map(row => row.items));
}

export async function listOrderRequests({
  status,
  search,
  productId,
  overdueOnly = false,
  startDate,
  endDate,
  page,
  pageSize,
}: OrderQuery) {
  const db = await getDb();
  if (!db) return null;
  const summaryScope = { search, productId, startDate, endDate };
  const scope = { ...summaryScope, status, overdueOnly };
  const conditions = buildOrderConditions(scope);
  const rows = await db
    .select()
    .from(orderRequests)
    .where(conditions)
    .orderBy(desc(orderRequests.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const counts = await db.select({ total: count() }).from(orderRequests).where(conditions);
  const [summary, trend, overdueCount, topProducts] = await Promise.all([
    getSummaryWithComparison(summaryScope),
    getOrderRequestTrend(scope),
    countOverdueOrderRequests(),
    getProductPopularity(scope),
  ]);
  if (!summary || !trend || overdueCount === null || !topProducts) return null;
  const total = Number(counts[0]?.total ?? 0);
  return {
    orders: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary,
    trend,
    overdueCount,
    topProducts,
  };
}

export async function exportOrderRequests({
  status,
  search,
  productId,
  overdueOnly = false,
  startDate,
  endDate,
}: Omit<OrderQuery, "page" | "pageSize">) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(orderRequests)
    .where(buildOrderConditions({ status, search, productId, overdueOnly, startDate, endDate }))
    .orderBy(desc(orderRequests.createdAt))
    .limit(1000);
}

export type UpdateOrderRequestInput = {
  status?: OrderRequestStatus;
  fulfillmentStage?: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export async function updateOrderRequestStatus(id: number, statusOrInput: OrderRequestStatus | UpdateOrderRequestInput) {
  const db = await getDb();
  if (!db) return null;

  const input: UpdateOrderRequestInput = typeof statusOrInput === "string" ? { status: statusOrInput } : statusOrInput;

  const statusFields: Partial<InsertOrderRequest> = {};
  if (input.status) {
    statusFields.status = input.status;
    if (input.status === "contacted") statusFields.contactedAt = new Date();
  }

  const shippingFields: Partial<InsertOrderRequest> = {};
  if (input.fulfillmentStage !== undefined) shippingFields.fulfillmentStage = input.fulfillmentStage;
  if (input.courierName !== undefined) shippingFields.courierName = input.courierName;
  if (input.trackingNumber !== undefined) shippingFields.trackingNumber = input.trackingNumber;
  if (input.trackingUrl !== undefined) shippingFields.trackingUrl = input.trackingUrl;

  const updateFields = { ...statusFields, ...shippingFields };
  if (Object.keys(updateFields).length > 0) {
    try {
      await db.update(orderRequests).set(updateFields).where(eq(orderRequests.id, id));
    } catch (error) {
      // Databases that have not run the shipping-columns migration yet can
      // still record the status change.
      console.warn("[Database] Shipping update failed, retrying with status only:", error);
      if (Object.keys(statusFields).length === 0) throw error;
      await db.update(orderRequests).set(statusFields).where(eq(orderRequests.id, id));
    }
  }

  const result = await db.select().from(orderRequests).where(eq(orderRequests.id, id)).limit(1);
  return result[0] ?? null;
}

/**
 * Looks up one order request by its exact reference (case-insensitive).
 * The reference is the only thing protecting a customer's contact details on
 * the public tracking page, so partial matches are never allowed.
 */
export async function getOrderRequestByReference(reference: string) {
  const db = await getDb();
  if (!db) return null;
  const cleaned = reference.trim().toUpperCase();
  if (!cleaned) return null;
  const rows = await db
    .select()
    .from(orderRequests)
    .where(sql`UPPER(${orderRequests.reference}) = ${cleaned}`)
    .limit(1);
  return rows[0] ?? null;
}
