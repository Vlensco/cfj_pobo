import { describe, expect, it } from "vitest";
import { BAG_MAX_AGE_MS, type CartItem, readStoredBag } from "./CartContext";

const item = { key: "junction-ls-Ink-M", quantity: 1 } as CartItem;
const NOW = Date.UTC(2026, 9, 27);

describe("saved bag", () => {
  it("restores a bag saved within the last 30 days", () => {
    const raw = JSON.stringify({ savedAt: NOW - BAG_MAX_AGE_MS + 1000, items: [item] });
    expect(readStoredBag(raw, NOW)).toEqual([item]);
  });

  it("drops a bag left untouched for more than 30 days", () => {
    const raw = JSON.stringify({ savedAt: NOW - BAG_MAX_AGE_MS - 1000, items: [item] });
    expect(readStoredBag(raw, NOW)).toEqual([]);
  });

  it("still reads bags saved before timestamps were added", () => {
    expect(readStoredBag(JSON.stringify([item]), NOW)).toEqual([item]);
    expect(readStoredBag(null, NOW)).toEqual([]);
  });
});
