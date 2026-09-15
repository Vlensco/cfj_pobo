export type StoreProduct = { id: string; name: string; amount: number };
export const storeProducts: StoreProduct[] = [
  { id: "junction-ls", name: "Junction Long Sleeve", amount: 1888000 },
  { id: "interval-jacket", name: "Interval Track Jacket", amount: 2976000 },
  { id: "archive-polo", name: "Archive Knit Polo", amount: 2272000 },
  { id: "halfway-cap", name: "Halfway Cap", amount: 928000 },
];
export const getStoreProduct = (id: string) => storeProducts.find(product => product.id === id);
