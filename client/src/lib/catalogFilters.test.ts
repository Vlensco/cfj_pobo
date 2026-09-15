import { describe, expect, it } from "vitest";
import { productCatalog } from "@/data/catalog";
import { applyCatalogPreferences, defaultCatalogPreferences, readCatalogPreferences, writeCatalogPreferences } from "./catalogFilters";

describe("catalog discovery preferences", () => {
  it("filters the catalogue by category, price, and keyword", () => {
    expect(applyCatalogPreferences(productCatalog, { ...defaultCatalogPreferences, category: "90s" }).map(product => product.id)).toEqual(["junction-ls", "interval-jacket"]);
    expect(applyCatalogPreferences(productCatalog, { ...defaultCatalogPreferences, price: "under-1m" }).map(product => product.id)).toEqual(["halfway-cap"]);
    expect(applyCatalogPreferences(productCatalog, { ...defaultCatalogPreferences, query: "technical" }).map(product => product.id)).toEqual(["interval-jacket"]);
  });
  it("sorts products by newest and ascending price", () => {
    expect(applyCatalogPreferences(productCatalog, { ...defaultCatalogPreferences, sort: "newest" })[0]?.id).toBe("halfway-cap");
    expect(applyCatalogPreferences(productCatalog, { ...defaultCatalogPreferences, sort: "price-asc" }).map(product => product.id)).toEqual(["halfway-cap", "junction-ls", "archive-polo", "interval-jacket"]);
  });
  it("serializes only active preferences into a shareable query string", () => {
    const preferences = { query: "jacket", category: "90s" as const, price: "2.5m-plus" as const, sort: "price-desc" as const };
    const search = writeCatalogPreferences(preferences);
    expect(search).toBe("?q=jacket&category=90s&price=2.5m-plus&sort=price-desc");
    expect(readCatalogPreferences(search)).toEqual(preferences);
  });
});
