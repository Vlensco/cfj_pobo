import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { followUpReminderDeliveries, followUpReminderSettings, orderRequests } from "../../drizzle/schema";
import { getOverdueCutoff, getReminderDateKey } from "../modules/followUp/followUpMonitoring";
import { getDb } from "./client";

// -------------------------------------------------------------
// Follow-up reminders
// -------------------------------------------------------------

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
