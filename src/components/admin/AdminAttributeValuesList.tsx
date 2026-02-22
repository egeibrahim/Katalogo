import * as React from "react";
import { X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type OptionRow = {
  id: string;
  value: string;
};

function SortableOptionRow({
  opt,
  onDelete,
}: {
  opt: OptionRow;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 truncate text-sm" title={opt.value}>
        {opt.value}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label="Sil"
        onClick={() => onDelete(opt.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PlainOptionRow({
  opt,
  onDelete,
}: {
  opt: OptionRow;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
      <div className="min-w-0 flex-1 truncate text-sm" title={opt.value}>
        {opt.value}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label="Sil"
        onClick={() => onDelete(opt.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AdminAttributeValuesList({
  options,
  onDelete,
  onReorder,
  className,
  emptyText = "No data yet",
}: {
  options: OptionRow[];
  onDelete: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  className?: string;
  emptyText?: string;
}) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.value.toLowerCase().includes(query));
  }, [options, q]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!onReorder || options.length === 0) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(options, oldIndex, newIndex);
      onReorder(reordered.map((o) => o.id));
    },
    [onReorder, options]
  );

  const sortable = Boolean(onReorder && options.length > 0);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" />
        </div>
        <div className="shrink-0 text-sm text-muted-foreground">{options.length}</div>
      </div>
      {sortable && (
        <p className="mt-1 text-xs text-muted-foreground">Drag to reorder.</p>
      )}

      <ScrollArea className="mt-2 h-64 rounded-md border bg-background">
        <div className="p-2">
          <div className="space-y-1">
            {sortable ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={options.map((o) => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {options.map((opt) => (
                    <SortableOptionRow
                      key={opt.id}
                      opt={opt}
                      onDelete={onDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              filtered.map((opt) => (
                <PlainOptionRow key={opt.id} opt={opt} onDelete={onDelete} />
              ))
            )}

            {(sortable ? options : filtered).length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
