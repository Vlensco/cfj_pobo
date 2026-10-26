import type { CartItem } from "@/contexts/CartContext";

/**
 * Cart lines in the shape the order and checkout endpoints expect.
 * Prices are deliberately left out: the server prices every line itself.
 */
export function toOrderItems(items: CartItem[]) {
  return items.map(item => ({
    productId: item.product.id,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
    customization: item.customization,
  }));
}
