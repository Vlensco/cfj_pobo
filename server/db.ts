import { and, count, desc, eq, gte, ilike, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  Customer,
  customers,
  followUpReminderDeliveries,
  followUpReminderSettings,
  InsertCustomer,
  InsertOrder,
  InsertOrderLineItem,
  InsertProduct,
  InsertProductImage,
  InsertProductVariant,
  InsertUser,
  Order,
  orderLineItems,
  orderRequests,
  orders,
  productAnalyticsEvents,
  InsertProductAnalyticsEvent,
  productImages,
  products,
  productVariants,
  users,
} from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { calculatePercentChange, getComparisonWindows } from "./adminMetrics";
import { OrderRequestStatus } from "./adminOrders";
import { getOverdueCutoff, getReminderDateKey, rankRequestedProducts } from "./followUpMonitoring";
import { ENV } from "./_core/env";

const { Pool } = pg;

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

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrationRan = false;

async function ensureTableColumns(pool: pg.Pool) {
  if (_migrationRan) return;
  _migrationRan = true;
  try {
    await pool.query(`
      ALTER TABLE IF EXISTS order_requests ADD COLUMN IF NOT EXISTS fulfillment_stage VARCHAR(32) DEFAULT 'placed';
      ALTER TABLE IF EXISTS order_requests ADD COLUMN IF NOT EXISTS courier_name VARCHAR(120);
      ALTER TABLE IF EXISTS order_requests ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120);
      ALTER TABLE IF EXISTS order_requests ADD COLUMN IF NOT EXISTS tracking_url TEXT;
      ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone VARCHAR(40);
      ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);
  } catch (e) {
    console.warn("[Database] ensureTableColumns notice:", e);
  }
}

export async function getDb() {
  if (!_db && (process.env.DATABASE_URL || ENV.databaseUrl)) {
    const connectionString = process.env.DATABASE_URL || ENV.databaseUrl;
    try {
      const isRemote =
        connectionString.includes("supabase.co") ||
        connectionString.includes("pooler.supabase.com") ||
        connectionString.includes("sslmode=") ||
        connectionString.includes("aws-");
      
      _pool = new Pool({
        connectionString,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(_pool, { schema });
      ensureTableColumns(_pool).catch(() => {});
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  } else if (_pool && !_migrationRan) {
    ensureTableColumns(_pool).catch(() => {});
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "phone", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

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

export async function updateOrderRequestStatus(
  id: number,
  statusOrInput: OrderRequestStatus | ({ id?: number; status?: OrderRequestStatus } & UpdateOrderRequestInput)
) {
  const db = await getDb();
  if (!db) return null;

  const input: UpdateOrderRequestInput =
    typeof statusOrInput === "string" ? { status: statusOrInput } : statusOrInput;

  const updateFields: Record<string, any> = {};
  if (input.status) {
    updateFields.status = input.status;
    if (input.status === "contacted") {
      updateFields.contactedAt = new Date();
    }
  }
  if (input.fulfillmentStage !== undefined) {
    updateFields.fulfillmentStage = input.fulfillmentStage;
  }
  if (input.courierName !== undefined) {
    updateFields.courierName = input.courierName;
  }
  if (input.trackingNumber !== undefined) {
    updateFields.trackingNumber = input.trackingNumber;
  }
  if (input.trackingUrl !== undefined) {
    updateFields.trackingUrl = input.trackingUrl;
  }

  try {
    await db
      .update(orderRequests)
      .set(updateFields)
      .where(eq(orderRequests.id, id));
  } catch (err) {
    console.warn("[Database] Error updating orderRequest with shipping columns, retrying basic status:", err);
    if (input.status) {
      await db
        .update(orderRequests)
        .set({ status: input.status, contactedAt: input.status === "contacted" ? new Date() : undefined })
        .where(eq(orderRequests.id, id));
    }
  }

  const result = await db.select().from(orderRequests).where(eq(orderRequests.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getOrderRequestByReference(reference: string) {
  const db = await getDb();
  if (!db) return null;
  const cleaned = reference.trim();
  const rows = await db
    .select()
    .from(orderRequests)
    .where(
      or(
        eq(orderRequests.reference, cleaned),
        ilike(orderRequests.reference, `%${cleaned}%`),
        ilike(orderRequests.notes, `%${cleaned}%`)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function claimFollowUpReminderCandidates(now = new Date()) {
  const db = await getDb();
  if (!db) return null;
  const candidates = await db
    .select()
    .from(orderRequests)
    .where(and(eq(orderRequests.status, "new"), lte(orderRequests.createdAt, getOverdueCutoff(now))))
    .orderBy(desc(orderRequests.createdAt))
    .limit(100);
  if (!candidates.length) return { orders: [], claimToken: null };
  const reminderDate = getReminderDateKey(now);
  const claimToken = crypto.randomUUID();
  for (const order of candidates) {
    await db
      .insert(followUpReminderDeliveries)
      .values({ orderRequestId: order.id, reminderDate, claimToken })
      .onConflictDoNothing();
  }
  const claims = await db
    .select({ orderRequestId: followUpReminderDeliveries.orderRequestId })
    .from(followUpReminderDeliveries)
    .where(
      and(
        eq(followUpReminderDeliveries.reminderDate, reminderDate),
        eq(followUpReminderDeliveries.claimToken, claimToken)
      )
    )
    .limit(100);
  const claimedIds = new Set(claims.map(claim => claim.orderRequestId));
  return { orders: candidates.filter(order => claimedIds.has(order.id)), claimToken };
}

export async function completeFollowUpReminderClaims(ids: number[], claimToken: string, at = new Date()) {
  const db = await getDb();
  if (!db) return false;
  if (!ids.length) return true;
  const claimCondition = and(
    inArray(followUpReminderDeliveries.orderRequestId, ids),
    eq(followUpReminderDeliveries.claimToken, claimToken)
  );
  await db.update(followUpReminderDeliveries).set({ status: "delivered", deliveredAt: at }).where(claimCondition);
  await db.update(orderRequests).set({ lastFollowUpReminderAt: at }).where(inArray(orderRequests.id, ids));
  return true;
}

export async function getFollowUpReminderSettings() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(followUpReminderSettings).orderBy(desc(followUpReminderSettings.id)).limit(1);
  return rows[0] ?? null;
}

export async function saveFollowUpReminderSchedule(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const current = await getFollowUpReminderSettings();
  if (current) {
    await db
      .update(followUpReminderSettings)
      .set({ scheduleCronTaskUid: taskUid, enabled: 1 })
      .where(eq(followUpReminderSettings.id, current.id));
  } else {
    await db.insert(followUpReminderSettings).values({ scheduleCronTaskUid: taskUid, enabled: 1 });
  }
  return getFollowUpReminderSettings();
}

export async function recordFollowUpReminderRun(at = new Date()) {
  const db = await getDb();
  if (!db) return false;
  const current = await getFollowUpReminderSettings();
  if (!current) return true;
  await db.update(followUpReminderSettings).set({ lastRunAt: at }).where(eq(followUpReminderSettings.id, current.id));
  return true;
}

// -------------------------------------------------------------
// Helper queries for Products, Customers, and Orders from CSV datasets
// -------------------------------------------------------------

export async function listDbProducts(options: { search?: string; type?: string; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const { search, type, limit = 50, offset = 0 } = options;
  const conditions = [];
  if (search) {
    conditions.push(or(ilike(products.title, `%${search}%`), ilike(products.handle, `%${search}%`)));
  }
  if (type) {
    conditions.push(eq(products.type, type));
  }

  const items = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  const handles = items.map(i => i.handle);
  if (!handles.length) return [];

  const variants = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productHandle, handles));
  const images = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productHandle, handles));

  return items.map(product => {
    const primaryVariant = variants.find(v => v.productHandle === product.handle) || null;
    const primaryImage = images.find(img => img.productHandle === product.handle) || null;
    return {
      ...product,
      primaryVariant,
      primaryImage,
    };
  });
}

export async function countDbProducts(options: { search?: string; type?: string } = {}) {
  const db = await getDb();
  if (!db) return 0;
  const { search, type } = options;
  const conditions = [];
  if (search) {
    conditions.push(or(ilike(products.title, `%${search}%`), ilike(products.handle, `%${search}%`)));
  }
  if (type) {
    conditions.push(eq(products.type, type));
  }

  const [res] = await db
    .select({ count: count() })
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined);

  return Number(res?.count || 0);
}

export async function getDbProductWithDetails(handle: string) {
  const db = await getDb();
  if (!db) return null;
  const [product] = await db.select().from(products).where(eq(products.handle, handle)).limit(1);
  if (!product) return null;
  const variants = await db.select().from(productVariants).where(eq(productVariants.productHandle, handle));
  const images = await db.select().from(productImages).where(eq(productImages.productHandle, handle)).orderBy(productImages.position);
  return { ...product, variants, images };
}

export async function listDbCustomers(options: { search?: string; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const { search, limit = 50, offset = 0 } = options;
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`),
        ilike(customers.phone, `%${search}%`)
      )
    );
  }
  return db
    .select()
    .from(customers)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset);
}

export async function listDbOrders(options: { search?: string; status?: string; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const { search, status, limit = 50, offset = 0 } = options;
  const conditions = [];
  if (search) {
    conditions.push(or(ilike(orders.name, `%${search}%`), ilike(orders.email, `%${search}%`)));
  }
  if (status) {
    conditions.push(eq(orders.financialStatus, status));
  }
  return db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getDbOrderWithItems(name: string) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.name, name)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderLineItems).where(eq(orderLineItems.orderName, name));
  return { ...order, items };
}

/**
 * Record a product analytics event (e.g. add-to-bag, view)
 */
export async function recordProductEvent(event: InsertProductAnalyticsEvent) {
  const db = await getDb();
  if (!db) return null;
  const [inserted] = await db.insert(productAnalyticsEvents).values(event).returning();
  return inserted;
}

/**
 * Get product analytics summary & leaderboard
 */
export async function getProductAnalyticsStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalAddToBag: 0,
      todayAddToBag: 0,
      topProducts: [],
      dailyTrends: [],
    };
  }

  // 1. Total Add to Bag
  const [totalRes] = await db
    .select({ total: count() })
    .from(productAnalyticsEvents)
    .where(eq(productAnalyticsEvents.eventType, "add_to_bag"));
  const totalAddToBag = Number(totalRes?.total || 0);

  // 2. Today's Add to Bag
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayRes] = await db
    .select({ today: count() })
    .from(productAnalyticsEvents)
    .where(
      and(
        eq(productAnalyticsEvents.eventType, "add_to_bag"),
        gte(productAnalyticsEvents.createdAt, todayStart)
      )
    );
  const todayAddToBag = Number(todayRes?.today || 0);

  // 3. Top Products Leaderboard
  const topProducts = await db
    .select({
      productId: productAnalyticsEvents.productId,
      productName: productAnalyticsEvents.productName,
      count: count(),
    })
    .from(productAnalyticsEvents)
    .where(eq(productAnalyticsEvents.eventType, "add_to_bag"))
    .groupBy(productAnalyticsEvents.productId, productAnalyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(8);

  // 4. Daily Trends (Last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dailyTrends = await db
    .select({
      date: sql<string>`TO_CHAR(${productAnalyticsEvents.createdAt}, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(productAnalyticsEvents)
    .where(
      and(
        eq(productAnalyticsEvents.eventType, "add_to_bag"),
        gte(productAnalyticsEvents.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${productAnalyticsEvents.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${productAnalyticsEvents.createdAt}, 'YYYY-MM-DD')`);

  return {
    totalAddToBag,
    todayAddToBag,
    topProducts: topProducts.map(p => ({ ...p, count: Number(p.count) })),
    dailyTrends: dailyTrends.map(t => ({ date: t.date, count: Number(t.count) })),
  };
}

/**
 * Admin Product CRUD operations
 */
export async function createAdminProduct(data: {
  title: string;
  handle: string;
  bodyHtml?: string;
  vendor?: string;
  type?: string;
  tags?: string;
  price: string;
  imageUrl?: string;
  colors?: string[];
  sizes?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // 1. Insert product
  const [createdProduct] = await db
    .insert(products)
    .values({
      handle: data.handle,
      title: data.title,
      bodyHtml: data.bodyHtml || "",
      vendor: data.vendor || "Terrace",
      type: data.type || "Apparel",
      tags: data.tags || "Drop 01",
      published: "true",
    })
    .returning();

  // 2. Insert variant
  await db.insert(productVariants).values({
    productHandle: data.handle,
    sku: `TR-${data.handle.substring(0, 8).toUpperCase()}`,
    price: data.price,
    inventoryQty: 20,
    option1Value: data.sizes?.[0] || "M",
    option2Value: data.colors?.[0] || "Standard",
  });

  // 3. Insert image if provided
  if (data.imageUrl) {
    await db.insert(productImages).values({
      productHandle: data.handle,
      position: 1,
      src: data.imageUrl,
    });
  }

  return createdProduct;
}

export async function updateAdminProduct(
  handle: string,
  data: {
    title?: string;
    bodyHtml?: string;
    type?: string;
    tags?: string;
    price?: string;
    imageUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // Update product fields
  const [updated] = await db
    .update(products)
    .set({
      title: data.title,
      bodyHtml: data.bodyHtml,
      type: data.type,
      tags: data.tags,
      updatedAt: new Date(),
    })
    .where(eq(products.handle, handle))
    .returning();

  // Update variant price if provided
  if (data.price) {
    await db
      .update(productVariants)
      .set({ price: data.price })
      .where(eq(productVariants.productHandle, handle));
  }

  // Update primary image if provided
  if (data.imageUrl) {
    const existing = await db
      .select()
      .from(productImages)
      .where(and(eq(productImages.productHandle, handle), eq(productImages.position, 1)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(productImages)
        .set({ src: data.imageUrl })
        .where(eq(productImages.id, existing[0].id));
    } else {
      await db.insert(productImages).values({
        productHandle: handle,
        position: 1,
        src: data.imageUrl,
      });
    }
  }

  return updated;
}

export async function deleteAdminProduct(handle: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  await db.delete(productImages).where(eq(productImages.productHandle, handle));
  await db.delete(productVariants).where(eq(productVariants.productHandle, handle));
  const [deleted] = await db.delete(products).where(eq(products.handle, handle)).returning();
  return deleted;
}

