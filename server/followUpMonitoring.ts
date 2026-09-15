import { parseRequestedPieces } from "./adminOrders";

export const FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;

export type ProductPopularity = {
  productId: string;
  name: string;
  requestedQuantity: number;
  requestCount: number;
};

export function getOverdueCutoff(now = new Date()): Date {
  return new Date(now.getTime() - FOLLOW_UP_DELAY_MS);
}

export function getReminderDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function rankRequestedProducts(serializedOrders: string[], limit = 5): ProductPopularity[] {
  const products = new Map<string, ProductPopularity>();

  for (const serialized of serializedOrders) {
    const seenInRequest = new Set<string>();
    for (const piece of parseRequestedPieces(serialized)) {
      if (!piece.productId || !piece.name || !Number.isFinite(piece.quantity) || piece.quantity <= 0) continue;
      const current = products.get(piece.productId) ?? {
        productId: piece.productId,
        name: piece.name,
        requestedQuantity: 0,
        requestCount: 0,
      };
      current.requestedQuantity += piece.quantity;
      if (!seenInRequest.has(piece.productId)) {
        current.requestCount += 1;
        seenInRequest.add(piece.productId);
      }
      products.set(piece.productId, current);
    }
  }

  return Array.from(products.values())
    .sort((a, b) => b.requestedQuantity - a.requestedQuantity || b.requestCount - a.requestCount || a.name.localeCompare(b.name, "id"))
    .slice(0, limit);
}
