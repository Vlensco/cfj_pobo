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
  it("keeps patches and namesets out of every view except Patches & Print", () => {
    const base = productCatalog[0];
    const patch = { ...base, id: "serie-a-patch", name: "1998-03 Serie A Italy Patch", collection: "Patches & Print", tags: "Patch, Serie A" };
    const nameset = { ...base, id: "zidane-nameset", name: "Zidane Juventus Nameset", collection: "Patches & Print", tags: "nameset, Patch" };
    // A shirt filed under the patch type by mistake is still a shirt.
    const misfiledShirt = { ...base, id: "milan-shirt", name: "1990 AC Milan Shirt", collection: "Patches & Print", tags: "1990's Collection, AC Milan, Shirt" };
    const catalog = [...productCatalog, patch, nameset, misfiledShirt];

    const all = applyCatalogPreferences(catalog, defaultCatalogPreferences).map(product => product.id);
    expect(all).not.toContain("serie-a-patch");
    expect(all).not.toContain("zidane-nameset");
    expect(all).toContain("milan-shirt");
    expect(all).toContain("junction-ls");

    const patches = applyCatalogPreferences(catalog, { ...defaultCatalogPreferences, category: "patches" }).map(product => product.id);
    expect(patches).toEqual(["serie-a-patch", "zidane-nameset"]);
  });
  it("serializes only active preferences into a shareable query string", () => {
    const preferences = { query: "jacket", category: "90s" as const, price: "2.5m-plus" as const, sort: "price-desc" as const };
    const search = writeCatalogPreferences(preferences);
    expect(search).toBe("?q=jacket&category=90s&price=2.5m-plus&sort=price-desc");
    expect(readCatalogPreferences(search)).toEqual(preferences);
  });
});
