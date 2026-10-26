import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { InsertProductAnalyticsEvent, productAnalyticsEvents } from "../../drizzle/schema";
import { getDb } from "./client";

// -------------------------------------------------------------
// Product analytics
// -------------------------------------------------------------

const ADD_TO_BAG_EVENT = "add_to_bag";

/** Records a storefront analytics event (e.g. add-to-bag). */
export async function recordProductEvent(event: InsertProductAnalyticsEvent) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [inserted] = await db.insert(productAnalyticsEvents).values(event).returning();
    return inserted;
  } catch (error) {
    console.warn("[Analytics] recordProductEvent failed (DB unreachable):", error);
    return null;
  }
}

/** Add-to-bag totals, leaderboard, and 7-day trend for the admin dashboard. */
export async function getProductAnalyticsStats() {
  const fallback = {
    totalAddToBag: 0,
    todayAddToBag: 0,
    topProducts: [],
    dailyTrends: [],
  };
  const db = await getDb();
  if (!db) return fallback;

  try {
    const [totalRes] = await db
      .select({ total: count() })
      .from(productAnalyticsEvents)
      .where(eq(productAnalyticsEvents.eventType, ADD_TO_BAG_EVENT));
    const totalAddToBag = Number(totalRes?.total || 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayRes] = await db
      .select({ today: count() })
      .from(productAnalyticsEvents)
      .where(
        and(
          eq(productAnalyticsEvents.eventType, ADD_TO_BAG_EVENT),
          gte(productAnalyticsEvents.createdAt, todayStart)
        )
      );
    const todayAddToBag = Number(todayRes?.today || 0);

    const topProducts = await db
      .select({
        productId: productAnalyticsEvents.productId,
        productName: productAnalyticsEvents.productName,
        count: count(),
      })
      .from(productAnalyticsEvents)
      .where(eq(productAnalyticsEvents.eventType, ADD_TO_BAG_EVENT))
      .groupBy(productAnalyticsEvents.productId, productAnalyticsEvents.productName)
      .orderBy(desc(count()))
      .limit(8);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eventDay = sql<string>`TO_CHAR(${productAnalyticsEvents.createdAt}, 'YYYY-MM-DD')`;
    const dailyTrends = await db
      .select({ date: eventDay, count: count() })
      .from(productAnalyticsEvents)
      .where(
        and(
          eq(productAnalyticsEvents.eventType, ADD_TO_BAG_EVENT),
          gte(productAnalyticsEvents.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(eventDay)
      .orderBy(eventDay);

    return {
      totalAddToBag,
      todayAddToBag,
      topProducts: topProducts.map(p => ({ ...p, count: Number(p.count) })),
      dailyTrends: dailyTrends.map(t => ({ date: t.date, count: Number(t.count) })),
    };
  } catch (error) {
    console.warn("[Analytics] getProductAnalyticsStats failed (DB unreachable):", error);
    return fallback;
  }
}
