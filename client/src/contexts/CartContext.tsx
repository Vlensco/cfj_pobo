import { Product } from "@/data/catalog";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string;
  product: Product;
  color: string;
  size: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, color: string, size: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "terrace-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored) as CartItem[]);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [hydrated, items]);

  const addItem = useCallback((product: Product, color: string, size: string) => {
    const key = `${product.id}-${color}-${size}`;
    setItems(current => {
      const existing = current.find(item => item.key === key);
      return existing
        ? current.map(item => (item.key === key ? { ...item, quantity: Math.min(item.quantity + 1, 8) } : item))
        : [...current, { key, product, color, size, quantity: 1 }];
    });
  }, []);

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

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.product.price * item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
