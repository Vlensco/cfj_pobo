import { describe, expect, it } from "vitest";
import { getStoreProduct } from "./products";
describe("Terrace product catalogue", () => {
  it("returns a known product by its stable ID", () => expect(getStoreProduct("junction-ls")?.name).toBe("Junction Long Sleeve"));
  it("uses Indonesian rupiah server-side product pricing", () => expect(getStoreProduct("halfway-cap")?.amount).toBe(928000));
});

