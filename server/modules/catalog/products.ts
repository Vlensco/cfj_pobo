import { getCsvStoreProduct } from "./csvCatalog";

/** Server-side price list. Order totals are always computed from these values, never from the client. */
export type StoreProduct = { id: string; name: string; amount: number; tags?: string | null };

export const storeProducts: StoreProduct[] = [
  { id: "junction-ls", name: "Junction Long Sleeve", amount: 1888000, tags: "Drop 01, Shirt, nameset:75000, patch_sku:PL-BADGE-26" },
  { id: "interval-jacket", name: "Interval Track Jacket", amount: 2976000, tags: "Drop 01, Jacket, no-nameset" },
  { id: "archive-polo", name: "Archive Knit Polo", amount: 2272000, tags: "Drop 01, Polo, nameset:75000, patch_sku:PL-BADGE-26" },
  { id: "halfway-cap", name: "Halfway Cap", amount: 928000, tags: "Objects, Accessory, no-nameset" },
];

export const getStoreProduct = (id: string): StoreProduct | null =>
  storeProducts.find(product => product.id === id) ?? getCsvStoreProduct(id);
