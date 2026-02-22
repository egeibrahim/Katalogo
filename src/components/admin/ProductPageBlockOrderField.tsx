import * as React from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ProductPageBlockKey =
  | "customization_options"
  | "unit_price"
  | "fulfillment"
  | "shipping";

const LABELS: Record<ProductPageBlockKey, string> = {
  customization_options: "Customization Options",
  unit_price: "Unit Price",
  fulfillment: "Fulfillment",
  shipping: "Shipping",
};

function normalizeOrder(input: ProductPageBlockKey[]): ProductPageBlockKey[] {
  const all: ProductPageBlockKey[] = ["customization_options", "unit_price", "fulfillment", "shipping"];
  const out: ProductPageBlockKey[] = [];
  for (const k of input) if (all.includes(k) && !out.includes(k)) out.push(k);
  for (const k of all) if (!out.includes(k)) out.push(k);
  return out;
}

function SortableRow({ id }: { id: ProductPageBlockKey }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "flex items-center justify-between gap-3 rounded-md border bg-card p-3 shadow-sm"
          : "flex items-center justify-between gap-3 rounded-md border bg-card p-3"
      }
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{LABELS[id]}</div>
        <div className="text-xs text-muted-foreground">Product page block</div>
      </div>

      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground"
        aria-label="Drag"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function ProductPageBlockOrderField({
  value,
  onChange,
}: {
  value: ProductPageBlockKey[];
  onChange: (next: ProductPageBlockKey[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const items = React.useMemo(() => normalizeOrder(value), [value]);

  const onDragEnd = React.useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over) return;
      if (active.id === over.id) return;
      const oldIndex = items.indexOf(active.id as ProductPageBlockKey);
      const newIndex = items.indexOf(over.id as ProductPageBlockKey);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange(arrayMove(items, oldIndex, newIndex));
    },
    [items, onChange]
  );

  return (
    <Card className="border-dashed">
      <div className="p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">Customize block order</div>
          <p className="text-xs text-muted-foreground">Drag to reorder blocks on the product page.</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((k) => (
                <SortableRow key={k} id={k} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </Card>
  );
}
