import type { Request, Response } from "express";
import type { OrderRequest } from "../drizzle/schema";
import { claimFollowUpReminderCandidates, completeFollowUpReminderClaims, getFollowUpReminderSettings, recordFollowUpReminderRun } from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

export function buildFollowUpReminderContent(orders: Pick<OrderRequest, "reference" | "customerName" | "createdAt">[]): string {
  const listedOrders = orders.slice(0, 5).map(order => `${order.reference} — ${order.customerName}`).join("\n");
  const remainder = orders.length > 5 ? `\n+ ${orders.length - 5} other request(s)` : "";
  return `${orders.length} New order request${orders.length === 1 ? " is" : "s are"} awaiting follow-up for more than 24 hours.\n\n${listedOrders}${remainder}\n\nOpen /admin/orders and select Needs follow-up to review them.`;
}

export async function followUpReminderHandler(req: Request, res: Response): Promise<void> {
  try {
    const caller = await sdk.authenticateRequest(req);
    if (!caller.isCron || !caller.taskUid) {
      res.status(403).json({ ok: false, error: "Scheduled-task authentication is required." });
      return;
    }

    const settings = await getFollowUpReminderSettings();
    if (!settings || settings.enabled !== 1 || settings.scheduleCronTaskUid !== caller.taskUid) {
      res.status(403).json({ ok: false, error: "This scheduled task is not authorized for follow-up reminders." });
      return;
    }

    const claim = await claimFollowUpReminderCandidates();
    if (!claim) {
      res.status(503).json({ ok: false, error: "Order requests are temporarily unavailable." });
      return;
    }

    if (!claim.orders.length) {
      await recordFollowUpReminderRun();
      res.json({ ok: true, notified: 0, reason: "No overdue New requests require a new reminder today." });
      return;
    }

    const delivered = await notifyOwner({
      title: `TERRACE follow-up: ${claim.orders.length} overdue New request${claim.orders.length === 1 ? "" : "s"}`,
      content: buildFollowUpReminderContent(claim.orders),
    });
    if (!delivered) {
      res.status(503).json({ ok: false, error: "Owner notification delivery is temporarily unavailable." });
      return;
    }

    const marked = await completeFollowUpReminderClaims(claim.orders.map(order => order.id), claim.claimToken ?? "");
    if (!marked) {
      res.status(500).json({ ok: false, error: "Reminder delivery could not be recorded." });
      return;
    }
    await recordFollowUpReminderRun();
    res.json({ ok: true, notified: claim.orders.length });
  } catch (error) {
    console.error("[Follow-up reminders] Scheduled request failed", error);
    res.status(500).json({ ok: false, error: "The scheduled follow-up reminder failed." });
  }
}
