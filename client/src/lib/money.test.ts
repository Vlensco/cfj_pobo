import { describe, expect, it } from "vitest";
import { formatPrice, STORE_CURRENCY } from "./money";

describe("store currency formatting", () => {
  it("formats catalog amounts in Indonesian rupiah", () => {
    expect(STORE_CURRENCY).toBe("IDR");
    expect(formatPrice(1888000)).toMatch(/1[.\s]888[.\s]000/);
  });
});
