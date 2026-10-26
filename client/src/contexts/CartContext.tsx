import { Product } from "@/data/catalog";
import { ItemCustomization } from "@shared/customization";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string;
  product: Product;
  color: string;
  size: string;
  quantity: number;
  customization?: ItemCustomization;
  unitPrice: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  addItem: (product: Product, color: string, size: string, customization?: ItemCustomization) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  /** Empties the bag and its notes, e.g. on sign-out so the next person on this device starts fresh. */
  resetBag: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "terrace-cart-v1";
const NOTES_STORAGE_KEY = "terrace-order-notes-v1";
/** A bag left untouched this long is dropped, so stale prices and sold-out pieces do not linger. */
export const BAG_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type StoredBag = { savedAt: number; items: CartItem[] };

/** Reads the saved bag; older saves were a bare item array without a timestamp. */
export function readStoredBag(raw: string | null, now = Date.now()): CartItem[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as StoredBag | CartItem[];
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || !Array.isArray(parsed.items) || now - parsed.savedAt > BAG_MAX_AGE_MS) return [];
  return parsed.items;
}

function calculateItemUnitPrice(product: Product, customization?: ItemCustomization): number {
  const namesetExtra = customization?.nameset ? Number(customization.nameset.price || 0) : 0;
  const patchExtra = customization?.patch ? Number(customization.patch.price || 0) : 0;
  return product.price + namesetExtra + patchExtra;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotesState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedItems = readStoredBag(localStorage.getItem(STORAGE_KEY));
      // Ensure unitPrice is always present
      setItems(
        storedItems.map(item => ({
          ...item,
          unitPrice: item.unitPrice || calculateItemUnitPrice(item.product, item.customization),
        }))
      );

      // Notes belong to the bag: an expired bag takes its notes with it.
      const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes && storedItems.length > 0) {
        setOrderNotesState(storedNotes);
      } else {
        localStorage.removeItem(NOTES_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const bag: StoredBag = { savedAt: Date.now(), items };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
    } catch {
      // Storage full or blocked: the bag still works for this visit.
    }
  }, [hydrated, items]);

  const setOrderNotes = useCallback((notes: string) => {
    setOrderNotesState(notes);
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, notes);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addItem = useCallback(
    (product: Product, color: string, size: string, customization?: ItemCustomization) => {
      const namesetPart = customization?.nameset
        ? `-${customization.nameset.name}-${customization.nameset.number}`
        : "";
      const patchPart = customization?.patch ? `-${customization.patch.sku}` : "";
      const key = `${product.id}-${color}-${size}${namesetPart}${patchPart}`;
      const unitPrice = calculateItemUnitPrice(product, customization);

      setItems(current => {
        const existing = current.find(item => item.key === key);
        return existing
          ? current.map(item => (item.key === key ? { ...item, quantity: Math.min(item.quantity + 1, 8) } : item))
          : [...current, { key, product, color, size, quantity: 1, customization, unitPrice }];
      });
    },
    []
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems(current =>
      quantity <= 0
        ? current.filter(item => item.key !== key)
        : current.map(item => (item.key === key ? { ...item, quantity: Math.min(quantity, 8) } : item))
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems(current => current.filter(item => item.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const resetBag = useCallback(() => {
    setItems([]);
    setOrderNotes("");
  }, [setOrderNotes]);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + (item.unitPrice || item.product.price) * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      orderNotes,
      setOrderNotes,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      resetBag,
    }),
    [items, itemCount, subtotal, orderNotes, setOrderNotes, addItem, updateQuantity, removeItem, clearCart, resetBag]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
