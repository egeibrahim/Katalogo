import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  currentProductId: string;
  onProductSelect: (productId: string) => void;
  currentProductName?: string;
  currentCategory?: string | null;
};

export function CatalogBar({
  currentProductId,
  onProductSelect,
  currentProductName,
}: Props) {
  const { items: cartItems } = useCart();
  const products = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of cartItems) {
      if (!byId.has(item.productId)) byId.set(item.productId, item.name);
    }
    const list = Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    if (currentProductId && !byId.has(currentProductId) && currentProductName) {
      list.unshift({ id: currentProductId, name: currentProductName });
    }
    return list;
  }, [cartItems, currentProductId, currentProductName]);

  return (
    <div className="w-full bg-white">
      <div className="flex items-center gap-3 px-3 py-2">
        <Select value={currentProductId || "__none__"} onValueChange={(v) => v !== "__none__" && onProductSelect(v)}>
          <SelectTrigger className="w-[200px] h-9 shrink-0">
            <SelectValue placeholder="Ürün seçin" />
          </SelectTrigger>
          <SelectContent>
            {products.length === 0 ? (
              <SelectItem value="__none__" disabled>Sepete ürün ekleyin</SelectItem>
            ) : (
              products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>
    </div>
  );
}

