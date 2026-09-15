export const orderRequestStatuses = ["new", "contacted", "closed"] as const;
export type OrderRequestStatus = (typeof orderRequestStatuses)[number];
export type RequestedPiece = { productId: string; name: string; quantity: number; color: string; size: string; unitAmount: number; lineTotal: number };

export function parseRequestedPieces(serialized: string): RequestedPiece[] {
  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value) ? value.filter((item): item is RequestedPiece => Boolean(item && typeof item === "object" && "name" in item && "quantity" in item)) : [];
  } catch { return []; }
}
