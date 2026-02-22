import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PrintArea = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  value: PrintArea;
  onChange: (next: PrintArea) => void;
  disabled?: boolean;
  /** Ölçü girerek kaydedilen cm + referans % (width_pct/height_pct varsa köşeden resize'da anlık cm hesaplanır) */
  dimensionsCm?: { width_cm: number; height_cm: number; width_pct?: number; height_pct?: number };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Ortalama için snap eşiği: merkez 50%'ye bu kadar yakınsa yatay/dikey ortalanır */
const CENTER_SNAP_THRESHOLD = 2.5;

function applyCenterSnap(area: PrintArea): PrintArea {
  const centerX = area.left + area.width / 2;
  const centerY = area.top + area.height / 2;
  let left = area.left;
  let top = area.top;
  if (Math.abs(centerX - 50) <= CENTER_SNAP_THRESHOLD) {
    left = Math.max(0, Math.min(100 - area.width, (100 - area.width) / 2));
  }
  if (Math.abs(centerY - 50) <= CENTER_SNAP_THRESHOLD) {
    top = Math.max(0, Math.min(100 - area.height, (100 - area.height) / 2));
  }
  return { ...area, left, top };
}

export function PrintAreaOverlay({ value, onChange, disabled, dimensionsCm }: Props) {
  const [mode, setMode] = useState<
    | null
    | { type: "drag"; startX: number; startY: number; start: PrintArea }
    | { type: "resize"; handle: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; start: PrintArea }
  >(null);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setMode({ type: "drag", startX: e.clientX, startY: e.clientY, start: value });
    },
    [disabled, value],
  );

  const startResize = useCallback(
    (handle: "nw" | "ne" | "sw" | "se") => (e: React.PointerEvent) => {
      if (disabled) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setMode({ type: "resize", handle, startX: e.clientX, startY: e.clientY, start: value });
    },
    [disabled, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!mode) return;

      // This overlay lives in a % based coordinate system (0-100).
      // We'll estimate delta% from the element's rendered size.
      const host = (e.currentTarget as HTMLElement).parentElement as HTMLElement | null;
      if (!host) return;

      const rect = host.getBoundingClientRect();
      const dxPct = ((e.clientX - mode.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - mode.startY) / rect.height) * 100;

      if (mode.type === "drag") {
        const raw: PrintArea = {
          ...mode.start,
          left: clamp(mode.start.left + dxPct, 0, 100 - mode.start.width),
          top: clamp(mode.start.top + dyPct, 0, 100 - mode.start.height),
        };
        onChange(applyCenterSnap(raw));
        return;
      }

      const minSize = 5;
      const start = mode.start;

      const next = { ...start };

      if (mode.handle === "nw") {
        next.left = clamp(start.left + dxPct, 0, start.left + start.width - minSize);
        next.top = clamp(start.top + dyPct, 0, start.top + start.height - minSize);
        next.width = clamp(start.width - dxPct, minSize, 100 - next.left);
        next.height = clamp(start.height - dyPct, minSize, 100 - next.top);
      }
      if (mode.handle === "ne") {
        next.top = clamp(start.top + dyPct, 0, start.top + start.height - minSize);
        next.width = clamp(start.width + dxPct, minSize, 100 - start.left);
        next.height = clamp(start.height - dyPct, minSize, 100 - next.top);
      }
      if (mode.handle === "sw") {
        next.left = clamp(start.left + dxPct, 0, start.left + start.width - minSize);
        next.width = clamp(start.width - dxPct, minSize, 100 - next.left);
        next.height = clamp(start.height + dyPct, minSize, 100 - start.top);
      }
      if (mode.handle === "se") {
        next.width = clamp(start.width + dxPct, minSize, 100 - start.left);
        next.height = clamp(start.height + dyPct, minSize, 100 - start.top);
      }

      // Sınırlar içinde tut
      next.left = clamp(next.left, 0, 100 - next.width);
      next.top = clamp(next.top, 0, 100 - next.height);

      onChange(next);
    },
    [mode, onChange],
  );

  const onPointerUp = useCallback(() => {
    if (mode?.type === "drag") onChange(applyCenterSnap(value));
    setMode(null);
  }, [mode, value, onChange]);

  const style = useMemo(
    () => ({
      left: `${value.left}%`,
      top: `${value.top}%`,
      width: `${value.width}%`,
      height: `${value.height}%`,
    }),
    [value],
  );

  const fmt = (n: number) => Math.round(n).toString();

  return (
    <div
      className={cn(
        "absolute rounded-md border border-primary/70 bg-primary/10",
        disabled ? "opacity-60" : "cursor-move",
      )}
      style={style}
      onPointerDown={startDrag}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Anlık ölçü etiketleri (köşelerde) */}
      <div className="absolute left-1 top-1 pointer-events-none rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
        L {fmt(value.left)}% · T {fmt(value.top)}%
      </div>
      <div className="absolute right-1 top-1 pointer-events-none rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
        W {fmt(value.width)}%
      </div>
      <div className="absolute bottom-1 left-1 pointer-events-none rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
        H {fmt(value.height)}%
      </div>
      <div className="absolute bottom-1 right-1 pointer-events-none rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary-foreground shadow-sm">
        {fmt(value.width)}% × {fmt(value.height)}%
      </div>
      {dimensionsCm ? (() => {
        const hasRef = dimensionsCm.width_pct != null && dimensionsCm.height_pct != null && dimensionsCm.width_pct > 0 && dimensionsCm.height_pct > 0;
        const liveW = hasRef ? (value.width / dimensionsCm.width_pct!) * dimensionsCm.width_cm : dimensionsCm.width_cm;
        const liveH = hasRef ? (value.height / dimensionsCm.height_pct!) * dimensionsCm.height_cm : dimensionsCm.height_cm;
        const fmtCm = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
        return (
          <div className="absolute left-1/2 bottom-1 -translate-x-1/2 pointer-events-none rounded bg-background/95 px-2 py-1 text-[11px] font-medium tabular-nums text-foreground shadow-sm border border-border">
            {fmtCm(liveW)} × {fmtCm(liveH)} cm
          </div>
        );
      })() : null}

      {/* handles */}
      {(["nw", "ne", "sw", "se"] as const).map((h) => (
        <div
          key={h}
          className={cn(
            "absolute h-2.5 w-2.5 rounded-full border border-border bg-background",
            disabled ? "cursor-not-allowed" : "cursor-nwse-resize",
          )}
          style={{
            left: h.includes("w") ? -5 : undefined,
            right: h.includes("e") ? -5 : undefined,
            top: h.includes("n") ? -5 : undefined,
            bottom: h.includes("s") ? -5 : undefined,
          }}
          onPointerDown={startResize(h)}
        />
      ))}
    </div>
  );
}
