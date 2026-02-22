/**
 * Seçili öğe için köşe/kenar boyutlandırma ve döndürme tutamacı.
 * Stage içinde render edilir (portal yok); öğe ile aynı konum/boyut/rotasyon.
 */
import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { DesignElement } from "./types";

const HANDLE_SIZE = 12;
const ROT_OFFSET = 20;
const ROTATE_SNAP_ANGLES = [0, 90, 180, -90]; // -90 = 270°
const ROTATE_SNAP_THRESHOLD = 8; // derece; bu kadar yakınsa 0/90/180/270'a yapışır
const RESIZE_HANDLES = ["nw", "ne", "se", "sw"] as const;
type ResizeHandle = (typeof RESIZE_HANDLES)[number];

/** Baskı alanı sınırları (stage %); verilirse resize bu alan içinde kalacak şekilde kısıtlanır */
export type BoundsPercent = { left: number; top: number; width: number; height: number };

type Props = {
  element: DesignElement;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDelete?: (id: string) => void;
  onSelectionClear?: () => void;
  /** Çerçeveye (kutuya) tıklanınca sürüklemeyi başlat; tutamacların tıklanabilir kalması için wrapper auto olacak */
  onFrameMouseDown?: (e: React.MouseEvent) => void;
  captureMode?: boolean;
  /** Baskı alanı sınırları (%); verilirse boyutlandırma bu alan içinde kalır */
  boundsPercent?: BoundsPercent;
};

export function TransformBox({
  element,
  stageRef,
  onUpdateElement,
  onDelete,
  onSelectionClear,
  onFrameMouseDown,
  captureMode = false,
  boundsPercent,
}: Props) {
  const [isResizing, setIsResizing] = useState(false);
  /** Resize sırasında sadece bu köşe tutamacı gösterilir */
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const resizeStartRef = useRef<{
    width: number;
    height: number;
    clientX: number;
    clientY: number;
    handle: string;
    centerX: number;
    centerY: number;
    /** Başlangıç rotasyonu (derece); fare hareketini çapraza projekte etmek için */
    startRotation: number;
    /** Metin öğesinde fontu orantılı büyütmek için başlangıç font size */
    startFontSize?: number;
  } | null>(null);
  const rotateStartRef = useRef<{
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
  } | null>(null);

  const w = element.width ?? 100;
  const h = element.height ?? 100;
  const rot = element.rotation ?? 0;

  // Resize: sadece köşelerden; her köşe hem genişlik hem yükseklik günceller (merkez sabit)
  useEffect(() => {
    if (!isResizing) return;
    const handle = resizeStartRef.current;
    if (!handle || !stageRef.current) return;
    const stage = stageRef.current;

    const onMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      const dx = e.clientX - handle.clientX;
      const dy = e.clientY - handle.clientY;
      // Köşe boyunca doğrusal hareket: fare deltasını element uzayına çevirip
      // ilgili köşenin çaprazına projekte ediyoruz (en-boy oranı korunur).
      const rotRad = (handle.startRotation * Math.PI) / 180;
      const cos = Math.cos(rotRad);
      const sin = Math.sin(rotRad);
      const dxEl = dx * cos - dy * sin;
      const dyEl = dx * sin + dy * cos;
      const hw = handle.width;
      const hh = handle.height;
      const denom = hw * hw + hh * hh || 1;
      let scale: number;
      switch (handle.handle) {
        case "se":
          scale = (dxEl * hw + dyEl * hh) / denom;
          break;
        case "nw":
          scale = -(dxEl * hw + dyEl * hh) / denom;
          break;
        case "ne":
          scale = (dxEl * hw - dyEl * hh) / denom;
          break;
        case "sw":
          scale = (-dxEl * hw + dyEl * hh) / denom;
          break;
        default:
          scale = 0;
      }
      let nw = hw * (1 + scale);
      let nh = hh * (1 + scale);
      const cx = (handle.centerX / 100) * rect.width;
      const cy = (handle.centerY / 100) * rect.height;
      let maxW: number;
      let maxH: number;
      if (boundsPercent && boundsPercent.width > 0 && boundsPercent.height > 0) {
        const leftPx = (boundsPercent.left / 100) * rect.width;
        const topPx = (boundsPercent.top / 100) * rect.height;
        const rightPx = ((boundsPercent.left + boundsPercent.width) / 100) * rect.width;
        const bottomPx = ((boundsPercent.top + boundsPercent.height) / 100) * rect.height;
        maxW = Math.max(24, 2 * Math.min(cx - leftPx, rightPx - cx));
        maxH = Math.max(24, 2 * Math.min(cy - topPx, bottomPx - cy));
      } else {
        maxW = 2 * Math.min(cx, rect.width - cx);
        maxH = 2 * Math.min(cy, rect.height - cy);
      }
      if (element.type === "image") {
        const aspect = hw / hh;
        const f = Math.min(maxW / nw, maxH / nh, 1);
        nw = Math.max(24, Math.min(maxW, nw * f));
        nh = Math.max(24, Math.min(maxH, nh * f));
        nw = Math.round(nw);
        nh = Math.round(nw / aspect);
        if (nh > maxH || nh < 24) {
          nh = Math.max(24, Math.min(maxH, nh));
          nw = Math.round(nh * aspect);
        }
        nw = Math.max(24, Math.min(maxW, nw));
        nh = Math.max(24, Math.min(maxH, nh));
      } else {
        nw = Math.max(24, Math.min(maxW, Math.round(nw)));
        nh = Math.max(24, Math.min(maxH, Math.round(nh)));
      }
      const updates: Partial<DesignElement> = {
        width: Math.round(nw),
        height: Math.round(nh),
        scaleX: 1,
        scaleY: 1,
      };
      if (element.type === "text" && handle.startFontSize != null) {
        const fontScale = (nw / hw + nh / hh) / 2;
        const newFontSize = Math.max(8, Math.min(500, Math.round(handle.startFontSize * fontScale)));
        updates.fontSize = newFontSize;
      }
      onUpdateElement(element.id, updates);
    };
    const onUp = () => {
      resizeStartRef.current = null;
      setActiveResizeHandle(null);
      setIsResizing(false);
    };
    const bodyCursor =
      handle.handle === "nw" || handle.handle === "se" ? "nwse-resize" : "nesw-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = bodyCursor;
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, element.id, onUpdateElement, stageRef, boundsPercent]);

  // Rotate: döndürme tutamacından sürükleyince rotation güncelle
  useEffect(() => {
    if (!isRotating) return;
    const start = rotateStartRef.current;
    if (!start) return;

    const onMove = (e: MouseEvent) => {
      const angle = Math.atan2(e.clientY - start.centerY, e.clientX - start.centerX);
      let deltaDeg = ((angle - start.startAngle) * 180) / Math.PI;
      let newRot = start.startRotation + deltaDeg;
      newRot = ((newRot % 360) + 360) % 360;
      if (newRot > 180) newRot -= 360;
      // 0°, 90°, 180°, 270° civarına yapıştır (newRot -180..180)
      const nearest = ROTATE_SNAP_ANGLES.reduce((best, a) =>
        Math.abs(newRot - a) < Math.abs(newRot - best) ? a : best
      );
      if (Math.abs(newRot - nearest) <= ROTATE_SNAP_THRESHOLD) {
        newRot = nearest;
      }
      onUpdateElement(element.id, { rotation: newRot });
    };
    const onUp = () => {
      rotateStartRef.current = null;
      setIsRotating(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isRotating, element.id, onUpdateElement]);

  if (captureMode) return null;

  const onResizeStart = (handle: ResizeHandle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageRef.current) return;
    resizeStartRef.current = {
      width: w,
      height: h,
      clientX: e.clientX,
      clientY: e.clientY,
      handle,
      centerX: element.x,
      centerY: element.y,
      startRotation: element.rotation ?? 0,
      ...(element.type === "text" && element.fontSize != null && { startFontSize: element.fontSize }),
    };
    setActiveResizeHandle(handle);
    setIsResizing(true);
  };

  const onRotateStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const centerX = rect.left + (element.x / 100) * rect.width;
    const centerY = rect.top + (element.y / 100) * rect.height;
    rotateStartRef.current = {
      centerX,
      centerY,
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
      startRotation: rot,
    };
    setIsRotating(true);
  };

  const cursorForHandle = (handle: ResizeHandle): React.CSSProperties["cursor"] =>
    handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize";

  const handleStyle = (handle: ResizeHandle, left: string, top: string): React.CSSProperties => ({
    position: "absolute",
    left,
    top,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    marginLeft: -HANDLE_SIZE / 2,
    marginTop: -HANDLE_SIZE / 2,
    border: "2px solid white",
    backgroundColor: "rgb(56 189 248)",
    borderRadius: 2,
    cursor: cursorForHandle(handle),
    zIndex: 30,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    pointerEvents: "auto",
  });

  const rotHandleStyle = {
    position: "absolute" as const,
    left: "50%",
    top: -ROT_OFFSET,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    marginLeft: -HANDLE_SIZE / 2,
    marginTop: -HANDLE_SIZE / 2,
    border: "2px solid white",
    backgroundColor: "rgb(56 189 248)",
    borderRadius: 2,
    cursor: "grab",
    zIndex: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: w,
        height: h,
        minWidth: w,
        minHeight: h,
        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        transformOrigin: "center center",
        boxSizing: "border-box",
        pointerEvents: "auto",
        zIndex: 25,
      }}
      aria-hidden
    >
      {/* Çerçeve: yazı alanıyla aynı (inset 0); tıklanınca sürükleme başlar */}
      <div
        role="presentation"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 2,
          border: "2px solid rgb(56 189 248)",
          backgroundColor: "rgba(56, 189, 248, 0.1)",
          pointerEvents: "auto",
          cursor: onFrameMouseDown ? "grab" : "default",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFrameMouseDown?.(e);
        }}
      />
      {/* Köşe tutamacları: resize sırasında sadece sürüklenen köşe aktif */}
      {RESIZE_HANDLES.filter((h) => !activeResizeHandle || activeResizeHandle === h).map((h) => {
        let left = "50%";
        let top = "50%";
        if (h.includes("n")) top = "0%";
        if (h.includes("s")) top = "100%";
        if (h.includes("w")) left = "0%";
        if (h.includes("e")) left = "100%";
        return (
          <div
            key={h}
            style={handleStyle(h, left, top)}
            onMouseDown={(e) => onResizeStart(h, e)}
            aria-label={`Resize ${h}`}
          />
        );
      })}
      {/* Döndürme tutamacı */}
      <div
        style={{ ...rotHandleStyle, zIndex: 30, pointerEvents: "auto" }}
        onMouseDown={onRotateStart}
        aria-label="Rotate"
      />
      {/* Sil butonu */}
      {onDelete && (
        <button
          type="button"
          className="flex items-center justify-center rounded-full bg-white text-black shadow-md border border-border hover:bg-muted cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            position: "absolute",
            left: -HANDLE_SIZE / 2 - 28,
            top: -HANDLE_SIZE / 2 - 28,
            width: 24,
            height: 24,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(element.id);
            onSelectionClear?.();
          }}
          aria-label="Delete element"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
