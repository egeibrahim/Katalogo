import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "newcatalog_cart";

export type CartItem = {
  /** Unique per line (same product with different size/color = different id). */
  id: string;
  productId: string;
  slug: string | null;
  name: string;
  price_from: number | null;
  currency?: string | null;
  product_code: string | null;
  cover_image_url: string | null;
  quantity: number;
  /** Beden bazlı adet (M: 1, L: 2, XL: 0 ...). Varsa quantity = toplamı. */
  quantityBySize?: Record<string, number>;
  /** Per-item fee from selected print placements (added to price_from for line total). */
  placementFeePerItem?: number;
  /** Selected size (e.g. "M") for this line – tek beden seçiliyse veya geri uyumluluk. */
  selectedSize?: string | null;
  /** Selected color name (e.g. "Black") for this line. */
  selectedColorName?: string | null;
  /** Selected technique (e.g. "DTG", "DTF") for this line. */
  selectedTechnique?: string | null;
  /** Selected print/placement areas with name and price for this line. */
  selectedPlacements?: Array<{ name: string; price: string }>;
  /** Tasarım verisi (Designer'dan "Sepete ekle" ile eklenen); view id -> öğe listesi. */
  designData?: Record<string, unknown[]>;
  /** Oluşturulan mockup görselleri (view id -> data URL veya URL) */
  mockupUrls?: Record<string, string>;
  /** Tasarım adı (opsiyonel). */
  designName?: string | null;
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "id">, quantity: number, quantityBySize?: Record<string, number>) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateQuantityBySize: (itemId: string, size: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  totalCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function genItemId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.map((i: CartItem) => ({ ...i, id: i.id || genItemId() }));
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity" | "id">, quantity: number, quantityBySize?: Record<string, number>) => {
      if (quantity < 1 && (!quantityBySize || Object.values(quantityBySize).every((q) => q < 1))) return;
      setItems((prev) => {
        const hasDesign = Boolean(item.designData && Object.keys(item.designData).length > 0);
        const color = item.selectedColorName ?? "";
        const existing = prev.find(
          (i) =>
            i.productId === item.productId &&
            (i.selectedColorName ?? "") === color &&
            !hasDesign &&
            !(i.designData && Object.keys(i.designData).length > 0)
        );
        const totalQty = quantityBySize
          ? Object.values(quantityBySize).reduce((s, q) => s + (Number(q) || 0), 0)
          : quantity;
        if (totalQty < 1) return prev;
        if (existing && !hasDesign) {
          return prev.map((i) => {
            if (i.id !== existing.id) return i;
            const base =
              existing.quantityBySize ??
              (existing.selectedSize ? { [existing.selectedSize]: existing.quantity } : {});
            let nextBySize = { ...base };
            if (quantityBySize) {
              for (const [size, q] of Object.entries(quantityBySize)) {
                nextBySize[size] = (nextBySize[size] ?? 0) + (Number(q) || 0);
              }
            } else if (item.selectedSize) {
              nextBySize[item.selectedSize] = (nextBySize[item.selectedSize] ?? 0) + quantity;
            }
            const sum = Object.values(nextBySize).reduce((s, q) => s + q, 0);
            return {
              ...i,
              quantityBySize: sum > 0 ? nextBySize : undefined,
              quantity: sum,
              placementFeePerItem: "placementFeePerItem" in item ? item.placementFeePerItem : i.placementFeePerItem,
              selectedTechnique: "selectedTechnique" in item ? item.selectedTechnique : i.selectedTechnique,
              selectedPlacements: "selectedPlacements" in item ? item.selectedPlacements : i.selectedPlacements,
            };
          });
        }
        const bySize = quantityBySize ?? (item.selectedSize ? { [item.selectedSize]: quantity } : undefined);
        const q = bySize ? Object.values(bySize).reduce((s, v) => s + (Number(v) || 0), 0) : quantity;
        return [...prev, { ...item, id: genItemId(), quantity: q, quantityBySize: bySize }];
      });
    },
    []
  );

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  }, []);

  const updateQuantityBySize = useCallback((itemId: string, size: string, qty: number) => {
    const safeQty = Math.max(0, Math.floor(Number(qty)) || 0);
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const base =
          i.quantityBySize ?? (i.selectedSize ? { [i.selectedSize]: i.quantity } : {});
        const nextBySize = { ...base };
        if (safeQty === 0) delete nextBySize[size];
        else nextBySize[size] = safeQty;
        const sum = Object.values(nextBySize).reduce((s, q) => s + q, 0);
        return {
          ...i,
          quantityBySize: Object.keys(nextBySize).length > 0 ? nextBySize : undefined,
          quantity: sum || 0,
        };
      })
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      updateQuantity,
      updateQuantityBySize,
      removeItem,
      clearCart,
      totalCount,
    }),
    [items, addItem, updateQuantity, updateQuantityBySize, removeItem, clearCart, totalCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
