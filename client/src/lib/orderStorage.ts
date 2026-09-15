export interface StoredCustomerOrder {
  reference: string;
  customerName?: string;
  email?: string;
  subtotal?: number;
  currency?: string;
  status?: string;
  itemCount?: number;
  itemTitle?: string;
  createdAt: string;
  paymentMethod?: string;
}

const STORAGE_KEY = "terrace_customer_orders_v1";

export function getSavedCustomerOrderRefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: StoredCustomerOrder[] = JSON.parse(raw);
    return list.map(o => o.reference).filter(Boolean);
  } catch {
    return [];
  }
}

export function getSavedCustomerOrders(): StoredCustomerOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomerOrder(order: StoredCustomerOrder) {
  if (typeof window === "undefined" || !order?.reference) return;
  try {
    const current = getSavedCustomerOrders();
    const filtered = current.filter(o => o.reference !== order.reference);
    filtered.unshift(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    console.warn("Failed to save order to localStorage", e);
  }
}

export function removeCustomerOrder(reference: string) {
  if (typeof window === "undefined" || !reference) return;
  try {
    const current = getSavedCustomerOrders();
    const filtered = current.filter(o => o.reference !== reference);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed to remove order from localStorage", e);
  }
}
