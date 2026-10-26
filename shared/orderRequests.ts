import type { ItemCustomization } from "./customization";

export const orderRequestStatuses = ["new", "contacted", "closed"] as const;
export type OrderRequestStatus = (typeof orderRequestStatuses)[number];

/** One priced line of an order request, as stored in the JSON `items` column. */
export type RequestedPiece = {
  productId: string;
  name: string;
  quantity: number;
  color: string;
  size: string;
  unitAmount: number;
  lineTotal: number;
  customization?: ItemCustomization | null;
};

/** Parses the stored `items` JSON, tolerating malformed or legacy rows. */
export function parseRequestedPieces(serialized: string): RequestedPiece[] {
  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value)
      ? value.filter(
          (item): item is RequestedPiece =>
            Boolean(item && typeof item === "object" && "name" in item && "quantity" in item)
        )
      : [];
  } catch {
    return [];
  }
}
