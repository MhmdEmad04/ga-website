"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type ColorId, type CartLine, type Product } from "@/lib/catalog";
import { useCatalog } from './catalog-provider';

const STORAGE_KEY = "garbalia-preview-cart-v1";
const CartContext = createContext<{
  lines: CartLine[];
  ready: boolean;
  count: number;
  addItem: (productId: string, color: ColorId, quantity: number) => void;
  updateItem: (productId: string, color: ColorId, quantity: number) => void;
  removeItem: (productId: string, color: ColorId) => void;
  consume: (items: CartLine[]) => void;
} | null>(null);

function readCart(getProduct: (id: string) => Product | undefined): CartLine[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    const result: CartLine[] = [];
    for (const value of saved) {
      if (!value || typeof value !== "object") continue;
      const product = getProduct(value.productId);
      const color = value.color as ColorId;
      if (!product || !Object.hasOwn(product.stock, color) || !Number.isInteger(value.quantity) || value.quantity < 1) continue;
      const existing = result.find((item) => item.productId === product.id && item.color === color);
      const quantity = Math.min(value.quantity + (existing?.quantity ?? 0), product.stock[color]);
      if (quantity < 1) continue;
      if (existing) existing.quantity = quantity;
      else result.push({ productId: product.id, color, quantity });
    }
    return result;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const {getProduct}=useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Synchronize the SSR-safe state with this browser's optional local storage.
    const timer = window.setTimeout(() => { setLines(readCart(getProduct)); setReady(true); }, 0);
    const synchronize = (event: StorageEvent) => { if (event.key === STORAGE_KEY) setLines(readCart(getProduct)); };
    window.addEventListener("storage", synchronize);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", synchronize); };
  }, [getProduct]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* Cart still works in memory when storage is unavailable. */ }
  }, [lines, ready]);

  const addItem = useCallback((productId: string, color: ColorId, quantity: number) => {
    const product = getProduct(productId);
    if (!product || !Object.hasOwn(product.stock, color) || !Number.isInteger(quantity) || quantity < 1) return;
    setLines((previous) => {
      const existing = previous.find((item) => item.productId === productId && item.color === color);
      const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, product.stock[color]);
      if (nextQuantity < 1) return previous;
      return existing
        ? previous.map((item) => item === existing ? { ...item, quantity: nextQuantity } : item)
        : [...previous, { productId, color, quantity: nextQuantity }];
    });
  }, [getProduct]);

  const updateItem = useCallback((productId: string, color: ColorId, quantity: number) => {
    const product = getProduct(productId);
    if (!product || !Object.hasOwn(product.stock, color) || !Number.isInteger(quantity)) return;
    setLines((previous) => previous.map((item) => item.productId === productId && item.color === color ? { ...item, quantity: Math.max(0, Math.min(quantity, product.stock[color])) } : item).filter((item) => item.quantity > 0));
  }, [getProduct]);

  const removeItem = useCallback((productId: string, color: ColorId) => {
    setLines((previous) => previous.filter((item) => item.productId !== productId || item.color !== color));
  }, []);

  const consume = useCallback((items: CartLine[]) => setLines((previous) => previous.map((line) => ({...line, quantity: line.quantity-(items.find((item)=>item.productId===line.productId && item.color===line.color)?.quantity || 0)})).filter((line)=>line.quantity>0)),[]);
  const visibleLines=lines.flatMap((line)=>{const product=getProduct(line.productId);const quantity=Math.min(line.quantity,30,product?.stock[line.color] || 0);return quantity>0?[{...line,quantity}]:[];});
  return <CartContext.Provider value={{ lines:visibleLines, ready, count: visibleLines.reduce((total, item) => total + item.quantity, 0), addItem, updateItem, removeItem, consume }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is required");
  return context;
}
