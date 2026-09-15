import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getSettings: vi.fn(),
  claimCandidates: vi.fn(),
  notifyOwner: vi.fn(),
  completeClaims: vi.fn(),
  recordRun: vi.fn(),
}));

vi.mock("./db", () => ({
  claimFollowUpReminderCandidates: mocks.claimCandidates,
  getFollowUpReminderSettings: mocks.getSettings,
  completeFollowUpReminderClaims: mocks.completeClaims,
  recordFollowUpReminderRun: mocks.recordRun,
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));

import { buildFollowUpReminderContent, followUpReminderHandler } from "./followUpReminders";

beforeEach(() => {
  Object.values(mocks).forEach(mock => mock.mockReset());
});

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("scheduled follow-up reminders", () => {
  it("summarizes overdue requests without exposing customer contact details", () => {
    expect(buildFollowUpReminderContent([{ reference: "TR-ONE", customerName: "Nadia", createdAt: new Date() } as any])).toContain("TR-ONE — Nadia");
  });

  it("rejects requests that were not authenticated as the configured scheduled task", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const res = response();
    await followUpReminderHandler({} as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("notifies the owner once and records sent reminders after successful delivery", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-1" });
    mocks.getSettings.mockResolvedValue({ enabled: 1, scheduleCronTaskUid: "cron-1" });
    mocks.claimCandidates.mockResolvedValue({ orders: [{ id: 7, reference: "TR-ONE", customerName: "Nadia", createdAt: new Date() }], claimToken: "claim-1" });
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.completeClaims.mockResolvedValue(true);
    mocks.recordRun.mockResolvedValue(true);
    const res = response();
    await followUpReminderHandler({} as any, res as any);
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "TERRACE follow-up: 1 overdue New request" }));
    expect(mocks.completeClaims).toHaveBeenCalledWith([7], "claim-1");
    expect(res.json).toHaveBeenCalledWith({ ok: true, notified: 1 });
  });

  it("does not complete claims when notification delivery is unavailable, allowing a later retry", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-1" });
    mocks.getSettings.mockResolvedValue({ enabled: 1, scheduleCronTaskUid: "cron-1" });
    mocks.claimCandidates.mockResolvedValue({ orders: [{ id: 7, reference: "TR-ONE", customerName: "Nadia", createdAt: new Date() }], claimToken: "claim-1" });
    mocks.notifyOwner.mockResolvedValue(false);
    const res = response();
    await followUpReminderHandler({} as any, res as any);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(mocks.completeClaims).not.toHaveBeenCalled();
  });

  it("does not send a duplicate when persistence fails after a successful owner delivery", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-1" });
    mocks.getSettings.mockResolvedValue({ enabled: 1, scheduleCronTaskUid: "cron-1" });
    mocks.claimCandidates.mockResolvedValueOnce({ orders: [{ id: 7, reference: "TR-ONE", customerName: "Nadia", createdAt: new Date() }], claimToken: "claim-1" }).mockResolvedValueOnce({ orders: [], claimToken: null });
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.completeClaims.mockResolvedValue(false);
    const first = response();
    await followUpReminderHandler({} as any, first as any);
    expect(first.status).toHaveBeenCalledWith(500);
    const retry = response();
    await followUpReminderHandler({} as any, retry as any);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect(retry.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, notified: 0 }));
  });
});
