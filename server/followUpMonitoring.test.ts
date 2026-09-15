/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { describe, expect, it } from "vitest";
import { FOLLOW_UP_DELAY_MS, getOverdueCutoff, getReminderDateKey, rankRequestedProducts } from "./followUpMonitoring";

describe("follow-up monitoring helpers", () => {
  it("builds the 24-hour overdue cutoff and a Jakarta-local reminder date key", () => {
    const now = new Date("2026-08-27T02:00:00.000Z");
    expect(getOverdueCutoff(now).getTime()).toBe(now.getTime() - FOLLOW_UP_DELAY_MS);
    expect(getReminderDateKey(now)).toBe("2026-08-27");
  });

  it("ranks requested quantities safely and counts a product once per request", () => {
    const ranking = rankRequestedProducts([
      '[{"productId":"junction-ls","name":"Junction Long Sleeve","quantity":2},{"productId":"junction-ls","name":"Junction Long Sleeve","quantity":1},{"productId":"club-trouser","name":"Club Trouser","quantity":3}]',
      '[{"productId":"junction-ls","name":"Junction Long Sleeve","quantity":1}]',
      "invalid-json",
    ]);
    expect(ranking).toEqual([
      { productId: "junction-ls", name: "Junction Long Sleeve", requestedQuantity: 4, requestCount: 2 },
      { productId: "club-trouser", name: "Club Trouser", requestedQuantity: 3, requestCount: 1 },
    ]);
  });
});
