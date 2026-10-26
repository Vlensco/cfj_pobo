import { DEFAULT_REGION, findRegion } from "@shared/regions";
import { describe, expect, it } from "vitest";
import { formatInRegion } from "./currency";

describe("display currency", () => {
  it("shows rupiah unchanged for the store's home region", () => {
    expect(formatInRegion(1888000, DEFAULT_REGION)).toMatch(/Rp\s?1\.888\.000/);
  });

  it("converts with live rates when they are available", () => {
    const us = findRegion("US")!;
    expect(formatInRegion(1600000, us, { USD: 1 / 16000 })).toBe("$100.00");
  });

  it("falls back to the built-in rate until live rates load", () => {
    const hongKong = findRegion("hk")!;
    expect(formatInRegion(2080000, hongKong)).toBe("HK$1,000.00");
  });

  it("keeps whole numbers for currencies without minor units", () => {
    const japan = findRegion("JP")!;
    expect(formatInRegion(1100000, japan, { JPY: 1 / 110 })).toBe("¥10,000");
  });
});
