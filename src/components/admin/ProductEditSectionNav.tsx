import * as React from "react";

type Item = {
  id: string;
  label: string;
};

export function ProductEditSectionNav({
  items,
  activeId,
  onSelect,
  topOffsetPx,
}: {
  items: Item[];
  activeId: string;
  onSelect: (id: string) => void;
  topOffsetPx?: number;
}) {
  return (
    <div
      className="sticky z-30 -mx-6 border-b border-gray-200 bg-gray-50/80 px-3 py-2 backdrop-blur sm:px-4"
      style={{ top: `${topOffsetPx ?? 56}px` }}
    >
      <nav
        className="flex w-full gap-0.5 overflow-x-auto py-0.5 scrollbar-thin"
        aria-label="Page sections"
      >
        <div className="flex min-w-0 gap-0.5 rounded-full bg-gray-200/80 p-0.5">
          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                aria-current={active ? "true" : undefined}
                className={
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 " +
                  (active
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-600 hover:bg-white/60 hover:text-gray-900")
                }
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
