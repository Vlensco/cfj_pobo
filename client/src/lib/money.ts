export const STORE_CURRENCY = "IDR";

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: STORE_CURRENCY, maximumFractionDigits: 0 }).format(amount);
}
