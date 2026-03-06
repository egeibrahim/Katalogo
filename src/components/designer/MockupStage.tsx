import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { TransformBox } from "./TransformBox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Save, X, Loader2, Trash2, Check, Upload, Ruler, Eraser, Lock, LockOpen, AlignCenterHorizontal } from "lucide-react";
import { SignedImage } from "@/components/ui/signed-image";
import { PrintArea, PrintAreaOverlay } from "./PrintAreaOverlay";
import { ViewSwitcher } from "./ViewSwitcher";
import type { DesignElement } from "./types";
import { DEFAULT_FONT_FAMILY } from "./types";

type Props = {
  mockupImage: string;

  /** Design elements to overlay on the mockup (baskı alanı) */
  designElements?: DesignElement[];

  views: Array<{ id: string; view_name: string }>;
  activeViewId: string;
  onViewChange: (viewId: string) => void;

  onAddView?: (viewName: string) => void;
  onUpdateViewName?: (viewId: string, newName: string) => void;
  onDeleteView?: (viewId: string) => void;
  onPickFileForView?: (viewId: string, file: File) => void;
  /** Baskı alanı içine eklenecek görsel için dosya seçtirir (tasarım öğesi olarak eklenir) */
  onPickFileForDesign?: (file: File) => void;

  /** Called after drag-drop reorder. Provide ordered view ids. */
  onReorderViews?: (orderedViewIds: string[]) => void;

  hasUnsavedMockup?: boolean;
  onSaveMockup?: () => void;
  onCancelMockup?: () => void;
  /** Kaydedilmiş mockup görselini bu görünümden kaldırır */
  onRemoveMockup?: () => void;
  isSavingMockup?: boolean;
  saveProgress?: number; // 0-100
  saveStatusText?: string;

  printArea?: PrintArea;
  onSavePrintArea?: (area: PrintArea) => void;
  disablePrintAreaEdit?: boolean;

  /** Baskı alanı oluşturucu dialogunu aç (en × boy cm ile baskı alanı oluştur) */
  onOpenPrintAreaCreator?: () => void;

  /** Baskı alanını sıfırla/sil (varsayılana döner, cm kaydı silinir) */
  onResetPrintArea?: () => void;

  /** Ölçü girerek kaydedilen cm boyutları + referans % (varsa anlık cm hesaplanır) */
  printAreaDimensionsCm?: { width_cm: number; height_cm: number; width_pct?: number; height_pct?: number };

  /** Değiştiğinde baskı alanı düzenleme modu açılır (Uygula sonrası taşınabilir) */
  triggerPrintAreaEdit?: number;

  /** Baskı alanı düzenleme modu değişince (true = düzenleniyor, kaydedilmedi) */
  onPrintAreaEditStateChange?: (isEditing: boolean) => void;

  /** Görseli silmek için (mevcut görünümdeki tasarım öğelerini temizler) */
  onClearDesignImages?: () => void;

  /** Baskı alanındaki öğelerin konum/boyut güncellemesi (sürükleme ile) */
  onUpdateElement?: (id: string, updates: Partial<DesignElement>) => void;

  /** Seçili öğe (mockup üzerinde tıklanınca) */
  selectedElementId?: string | null;
  /** Seçim değişince (tek öğe seçimi) */
  onSelectionChange?: (ids: string[], primaryId: string | null) => void;
  /** Seçili öğeyi sil (Sil butonu / Delete tuşu) */
  onDeleteElement?: (id: string) => void;

  /** Görsel üzerinde kırp modu (Tapstitch tarzı) */
  cropModeElementId?: string | null;
  cropRegion?: { left: number; top: number; width: number; height: number };
  onCropRegionChange?: (r: { left: number; top: number; width: number; height: number }) => void;
  onCropConfirm?: (elementId: string, region: { left: number; top: number; width: number; height: number }) => void;
  onCropCancel?: () => void;

  /** Baskı alanı üzerinde ızgara göster (Tapstitch tarzı) */
  showGrid?: boolean;

  /** Yakınlaştırma (100 = %100) */
  zoom?: number;

  /** Export/capture sırasında baskı alanı çerçevesi ve seçim tutamacı gizlensin (görüntü üst üste binmesin) */
  captureMode?: boolean;
};

export function MockupStage({
  mockupImage,
  designElements = [],
  views,
  activeViewId,
  onViewChange,
  onAddView,
  onUpdateViewName,
  onDeleteView,
  onPickFileForView,
  onPickFileForDesign,
  onReorderViews,
  hasUnsavedMockup,
  onSaveMockup,
  onCancelMockup,
  onRemoveMockup,
  isSavingMockup,
  saveProgress = 0,
  saveStatusText,
  printArea,
  onSavePrintArea,
  disablePrintAreaEdit,
  onOpenPrintAreaCreator,
  onResetPrintArea,
  printAreaDimensionsCm,
  triggerPrintAreaEdit,
  onPrintAreaEditStateChange,
  onClearDesignImages,
  onUpdateElement,
  selectedElementId,
  onSelectionChange,
  onDeleteElement,
  cropModeElementId,
  cropRegion = { left: 0, top: 0, width: 100, height: 100 },
  onCropRegionChange,
  onCropConfirm,
  onCropCancel,
  showGrid = false,
  zoom = 100,
  captureMode = false,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const mockupFileInputRef = useRef<HTMLInputElement>(null);
  const designFileInputRef = useRef<HTMLInputElement>(null);
  const selectedTextSpanRef = useRef<HTMLSpanElement | null>(null);
  const designElementsRef = useRef(designElements);
  designElementsRef.current = designElements;
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const [mockupNaturalSize, setMockupNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const portalRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMockupNaturalSize(null), [mockupImage]);

  type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
  const [croppingHandle, setCroppingHandle] = useState<CropHandle | null>(null);
  const cropDragStartRef = useRef<{ region: typeof cropRegion; clientX: number; clientY: number } | null>(null);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.createElement("div");
    root.id = "mockup-crop-portal-root";
    root.setAttribute("style", "position:fixed;inset:0;z-index:2147483647;pointer-events:none;");
    document.body.appendChild(root);
    (portalRootRef as React.MutableRefObject<HTMLDivElement | null>).current = root;
    return () => {
      if (root.parentNode) root.parentNode.removeChild(root);
      (portalRootRef as React.MutableRefObject<HTMLDivElement | null>).current = null;
    };
  }, []);

  const [isEditingPrintArea, setIsEditingPrintArea] = useState(false);
  const [draftArea, setDraftArea] = useState<PrintArea | null>(null);

  useEffect(() => {
    if (triggerPrintAreaEdit && printArea && printArea.width > 0 && printArea.height > 0) {
      setDraftArea(printArea);
      setIsEditingPrintArea(true);
    } else if (triggerPrintAreaEdit) {
      setDraftArea({ top: 25, left: 25, width: 50, height: 40 });
      setIsEditingPrintArea(true);
    }
  }, [triggerPrintAreaEdit]);

  // Baskı alanı silindiğinde draft'ı temizle
  useEffect(() => {
    if (!printArea || Number(printArea.width) <= 0 || Number(printArea.height) <= 0) {
      setDraftArea(null);
      setIsEditingPrintArea(false);
    }
  }, [printArea?.left, printArea?.top, printArea?.width, printArea?.height]);

  useEffect(() => {
    onPrintAreaEditStateChange?.(isEditingPrintArea);
  }, [isEditingPrintArea, onPrintAreaEditStateChange]);

  const hasVisiblePrintArea = Boolean(
    printArea != null && Number(printArea.width) > 0 && Number(printArea.height) > 0
  );
  const hasValidSavedArea = hasVisiblePrintArea;
  const canEditPrintArea = Boolean(onSavePrintArea) && !disablePrintAreaEdit;
  const isPrintAreaDirty =
    Boolean(draftArea) &&
    (Number(draftArea.width) > 0 && Number(draftArea.height) > 0) &&
    (!hasValidSavedArea || (printArea != null && JSON.stringify(draftArea) !== JSON.stringify(printArea)));
  /** Yeni oluşturulmuş alanı hareket ettirmeden de kaydetmek için: draft geçerli boyutlarda olduğunda buton aktif olsun. */
  const canSavePrintArea =
    Boolean(draftArea) && Number(draftArea.width) > 0 && Number(draftArea.height) > 0;

  const effectiveArea = draftArea ?? (hasVisiblePrintArea ? printArea! : null) ?? { top: 30, left: 30, width: 40, height: 40 };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setStageRect(stage.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [selectedElementId, effectiveArea.left, effectiveArea.top, effectiveArea.width, effectiveArea.height, draggingElementId]);

  // Seçili metin kutusunu metne sığdır: seçim veya metin içeriği/font değiştiğinde tutmacı güncelle
  const selectedTextSig = (() => {
    const sel = selectedElementId
      ? designElements.find(
          (el) =>
            el.id === selectedElementId &&
            el.type === "text" &&
            el.isVisible !== false
        )
      : null;
    if (!sel) return "";
    return `${sel.content}|${sel.fontSize ?? 24}|${sel.fontFamily ?? ""}|${sel.fontWeight ?? "normal"}|${sel.fontStyle ?? "normal"}`;
  })();
  useLayoutEffect(() => {
    const elements = designElementsRef.current;
    const sel = selectedElementId
      ? elements.find(
          (el) =>
            el.id === selectedElementId &&
            el.type === "text" &&
            el.isVisible !== false
        )
      : null;
    if (!sel) {
      selectedTextSpanRef.current = null;
      return;
    }
    if (!onUpdateElement || typeof document === "undefined") return;
    const elId = sel.id;
    const cw = sel.width ?? 100;
    const ch = sel.height ?? 100;
    const padding = 10;
    let cancelled = false;

    const measureIntrinsicSize = () => {
      const probe = document.createElement("span");
      probe.style.cssText = [
        "position:absolute",
        "left:-9999px",
        "top:0",
        "visibility:hidden",
        "white-space:nowrap",
        "pointer-events:none",
        `font-size:${sel.fontSize ?? 24}px`,
        `font-family:${sel.fontFamily || DEFAULT_FONT_FAMILY}, sans-serif`,
        `font-weight:${sel.fontWeight ?? "normal"}`,
        `font-style:${sel.fontStyle ?? "normal"}`,
      ].join(";");
      probe.textContent = sel.content || "";
      document.body.appendChild(probe);
      const rect = probe.getBoundingClientRect();
      probe.remove();
      return { w: rect.width, h: rect.height };
    };

    const applyMeasure = () => {
      if (cancelled) return;
      const { w, h } = measureIntrinsicSize();
      if (w < 1 || h < 1) return;
      const fitW = Math.max(24, Math.ceil(w) + padding * 2);
      const fitH = Math.max(24, Math.ceil(h) + padding * 2);
      if (Math.abs(fitW - cw) > 2 || Math.abs(fitH - ch) > 2) {
        onUpdateElement(elId, { width: fitW, height: fitH });
      }
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(applyMeasure);
    });
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) requestAnimationFrame(applyMeasure);
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelled = true;
    };
  }, [selectedElementId, onUpdateElement, selectedTextSig, designElements.length]);

  const cropSel =
    !captureMode &&
    cropModeElementId &&
    stageRect &&
    stageRect.width > 0 &&
    portalRootRef.current
      ?     designElements.find(
          (el) =>
            el.id === cropModeElementId &&
            el.isVisible !== false &&
            el.type === "image" &&
            el.imageUrl
        )
      : null;

  // Sürükleme: x,y güncelle; öğe baskı alanı (effectiveArea) içinde kalsın
  useEffect(() => {
    if (!draggingElementId || !onUpdateElement || !stageRef.current) return;

    const stage = stageRef.current;
    const el = designElements.find((e) => e.id === draggingElementId);
    const w = el?.width ?? 100;
    const h = el?.height ?? 100;

    const onMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      const percentX = ((e.clientX - rect.left) / rect.width) * 100;
      const percentY = ((e.clientY - rect.top) / rect.height) * 100;
      const halfW_pct = (w / rect.width) * 50;
      const halfH_pct = (h / rect.height) * 50;
      const minX = effectiveArea.left + halfW_pct;
      const maxX = effectiveArea.left + effectiveArea.width - halfW_pct;
      const minY = effectiveArea.top + halfH_pct;
      const maxY = effectiveArea.top + effectiveArea.height - halfH_pct;
      const x = Math.max(minX, Math.min(maxX, percentX));
      const y = Math.max(minY, Math.min(maxY, percentY));
      onUpdateElement(draggingElementId, { x, y });
    };

    const onUp = () => {
      onSelectionChange?.([draggingElementId], draggingElementId);
      setDraggingElementId(null);
      dragStartRef.current = null;
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
  }, [draggingElementId, onUpdateElement, onSelectionChange, designElements, effectiveArea]);

  // Kırp tutamacı sürükleme: client → element % → cropRegion güncelle
  useEffect(() => {
    if (!croppingHandle || !cropModeElementId || !onCropRegionChange || !stageRect || !cropDragStartRef.current) return;
    const el = designElements.find((e) => e.id === cropModeElementId);
    if (!el || el.type !== "image") return;
    const w = el.width ?? 100;
    const h = el.height ?? 100;
    const cx = stageRect.left + (el.x / 100) * stageRect.width;
    const cy = stageRect.top + (el.y / 100) * stageRect.height;
    const rad = ((el.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);

    const clientToPercent = (sx: number, sy: number) => {
      const dx = (sx - cx) * cos - (sy - cy) * sin;
      const dy = (sx - cx) * sin + (sy - cy) * cos;
      const px = ((dx + w / 2) / w) * 100;
      const py = ((dy + h / 2) / h) * 100;
      return { px: Math.max(0, Math.min(100, px)), py: Math.max(0, Math.min(100, py)) };
    };

    const onMove = (e: MouseEvent) => {
      const start = cropDragStartRef.current!;
      const { px, py } = clientToPercent(e.clientX, e.clientY);
      let left = start.region.left;
      let top = start.region.top;
      let width = start.region.width;
      let height = start.region.height;
      const right = left + width;
      const bottom = top + height;
      const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
      switch (croppingHandle) {
        case "e":
          width = clamp(px - left, 1, 100 - left);
          break;
        case "w":
          left = clamp(px, 0, right - 1);
          width = right - left;
          break;
        case "s":
          height = clamp(py - top, 1, 100 - top);
          break;
        case "n":
          top = clamp(py, 0, bottom - 1);
          height = bottom - top;
          break;
        case "se":
          width = clamp(px - left, 1, 100 - left);
          height = clamp(py - top, 1, 100 - top);
          break;
        case "sw":
          left = clamp(px, 0, right - 1);
          width = right - left;
          height = clamp(py - top, 1, 100 - top);
          break;
        case "ne":
          width = clamp(px - left, 1, 100 - left);
          top = clamp(py, 0, bottom - 1);
          height = bottom - top;
          break;
        case "nw":
          left = clamp(px, 0, right - 1);
          width = right - left;
          top = clamp(py, 0, bottom - 1);
          height = bottom - top;
          break;
      }
      onCropRegionChange({ left, top, width, height });
      cropDragStartRef.current = { region: { left, top, width, height }, clientX: e.clientX, clientY: e.clientY };
    };

    const onUp = () => {
      setCroppingHandle(null);
      cropDragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [croppingHandle, cropModeElementId, designElements, onCropRegionChange, stageRect]);

  // Prefer explicit staged flag from parent; fall back to blob URL heuristic.
  const isStagedMockup = Boolean(hasUnsavedMockup ?? mockupImage.startsWith("blob:"));
  const canSaveOrCancel = isStagedMockup && Boolean(onSaveMockup) && Boolean(onCancelMockup);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
      {/* Preview area - ekrana sığar, zoom uygulanır */}
      <div ref={rootContainerRef} className="flex-1 flex items-center justify-center overflow-hidden min-h-0 min-w-0 bg-white">
        <div
          className="relative w-full h-full mx-auto origin-center flex items-center justify-center bg-white"
          style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined }}
        >
          <div className="relative overflow-visible max-w-full max-h-full w-full h-full flex items-center justify-center bg-white" aria-label="Mockup preview">
            {/* Mockup alanı; zemin kutusu yok */}
            <div
              ref={stageRef}
              id="design-canvas"
              className={cn(
                "relative overflow-visible h-full max-h-full w-auto max-w-full bg-white",
                (!mockupNaturalSize || !mockupNaturalSize.width || !mockupNaturalSize.height) && "aspect-square"
              )}
              style={
                mockupNaturalSize && mockupNaturalSize.width > 0 && mockupNaturalSize.height > 0
                  ? { aspectRatio: `${mockupNaturalSize.width} / ${mockupNaturalSize.height}` }
                  : undefined
              }
            >
              {mockupImage ? (
                mockupImage.startsWith("blob:") ? (
                  <img
                    src={mockupImage}
                    alt="Mockup önizleme"
                    className="absolute inset-0 w-full h-full object-contain object-center select-none"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setMockupNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                ) : (
                  <SignedImage
                    src={mockupImage}
                    alt="Mockup önizleme"
                    className="absolute inset-0 w-full h-full object-contain object-center select-none"
                    draggable={false}
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setMockupNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                )
              ) : !captureMode ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  {!hasVisiblePrintArea && (
                    <p className="text-xs text-muted-foreground">Baskı alanı oluşturduktan sonra üstte &quot;Görsel yükle&quot; ile baskı alanı içine tasarım görseli ekleyebilirsiniz.</p>
                  )}
                </div>
              ) : null}

              {/* Tasarım öğeleri (görsel + metin) yalnızca baskı alanı içinde; mockup zemin = sadece mockupImage (view mockup) */}
              <div
                ref={printAreaRef}
                className="absolute inset-0 z-10"
                style={{
                  pointerEvents: isEditingPrintArea ? "none" : "auto",
                }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) onSelectionChange?.([], null);
                }}
              >
                {effectiveArea.width > 0 && effectiveArea.height > 0 ? (
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${effectiveArea.left}%`,
                      top: `${effectiveArea.top}%`,
                      width: `${effectiveArea.width}%`,
                      height: `${effectiveArea.height}%`,
                    }}
                  >
                    {designElements
                      .filter(
                        (el) => el.isVisible !== false && (el.type === "text" || (el.type === "image" && el.imageUrl))
                      )
                      .map((element) => {
                        const isImage = element.type === "image" && element.imageUrl;
                        const w = element.width ?? 100;
                        const h = element.height ?? 100;
                        const isCropMode = cropModeElementId === element.id;
                        const canDrag = Boolean(onUpdateElement) && !element.isLocked && !isCropMode;
                        const isSelected = selectedElementId === element.id;
                        const relLeft = (element.x - effectiveArea.left) / effectiveArea.width * 100;
                        const relTop = (element.y - effectiveArea.top) / effectiveArea.height * 100;

                        return (
                          <div
                            key={element.id}
                            className={cn(
                              "absolute box-border flex items-center justify-center overflow-hidden group",
                              canDrag && "cursor-grab active:cursor-grabbing"
                            )}
                            style={{
                              left: `calc(${relLeft}% - ${w / 2}px)`,
                              top: `calc(${relTop}% - ${h / 2}px)`,
                          width: w,
                          height: h,
                          minWidth: w,
                          maxWidth: w,
                          minHeight: h,
                          maxHeight: h,
                          transform: `rotate(${element.rotation || 0}deg) scale(${element.scaleX ?? 1}, ${element.scaleY ?? 1})`,
                          transformOrigin: "center center",
                        }}
                        onMouseDown={
                          canDrag
                            ? (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragStartRef.current = { x: e.clientX, y: e.clientY, width: w, height: h };
                                setDraggingElementId(element.id);
                                if (!isSelected) onSelectionChange?.([element.id], element.id);
                              }
                            : undefined
                        }
                      >
                        <div className="absolute inset-0 overflow-hidden flex items-center justify-center rounded-sm min-w-0">
                        {element.type === "text" ? (
                          <span
                            ref={isSelected ? (el) => { (selectedTextSpanRef as React.MutableRefObject<HTMLSpanElement | null>).current = el; } : undefined}
                            className="min-w-0 max-w-full overflow-hidden"
                            style={{
                              fontSize: element.fontSize,
                              color: element.color,
                              fontFamily: element.fontFamily || DEFAULT_FONT_FAMILY,
                              fontWeight: element.fontWeight,
                              fontStyle: element.fontStyle,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {element.content}
                          </span>
                        ) : isImage ? (
                          isCropMode ? (
                            <div className="absolute inset-0 w-full h-full">
                              {element.imageUrl!.startsWith("blob:") ? (
                                <>
                                  <img
                                    src={element.imageUrl!}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none opacity-40"
                                    draggable={false}
                                  />
                                  <img
                                    src={element.imageUrl!}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                                    draggable={false}
                                    style={{
                                      clipPath: `inset(${cropRegion.top}% ${100 - cropRegion.left - cropRegion.width}% ${100 - cropRegion.top - cropRegion.height}% ${cropRegion.left}%)`,
                                    }}
                                  />
                                </>
                              ) : (
                                <>
                                  <SignedImage
                                    src={element.imageUrl!}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none opacity-40"
                                    draggable={false}
                                    crossOrigin="anonymous"
                                  />
                                  <SignedImage
                                    src={element.imageUrl!}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                                    draggable={false}
                                    crossOrigin="anonymous"
                                    style={{
                                      clipPath: `inset(${cropRegion.top}% ${100 - cropRegion.left - cropRegion.width}% ${100 - cropRegion.top - cropRegion.height}% ${cropRegion.left}%)`,
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          ) : element.imageUrl!.startsWith("blob:") ? (
                            <img
                              src={element.imageUrl!}
                              alt=""
                              style={{ width: w, height: h, minWidth: w, maxWidth: w, minHeight: h, maxHeight: h }}
                              className="object-contain select-none pointer-events-none"
                              draggable={false}
                            />
                          ) : (
                            <SignedImage
                              src={element.imageUrl!}
                              alt=""
                              style={{ width: w, height: h, minWidth: w, maxWidth: w, minHeight: h, maxHeight: h }}
                              className="object-contain select-none pointer-events-none"
                              draggable={false}
                              crossOrigin="anonymous"
                            />
                          )
                        ) : null}
                        </div>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </div>

              {/* Seçili öğe: TransformBox (stage içinde, köşe resize + döndürme + sil) */}
              {!captureMode &&
                selectedElementId &&
                !draggingElementId &&
                (() => {
                  const sel = designElements.find(
                    (el) =>
                      el.id === selectedElementId &&
                      el.isVisible !== false &&
                      (el.type === "text" || (el.type === "image" && el.imageUrl))
                  );
                  if (!sel || !onUpdateElement || sel.isLocked) return null;
                  if (cropModeElementId === sel.id) return null;
                  return (
                    <TransformBox
                      element={sel}
                      stageRef={stageRef}
                      onUpdateElement={onUpdateElement}
                      onDelete={onDeleteElement}
                      onSelectionClear={() => onSelectionChange?.([], null)}
                      onFrameMouseDown={(e) => {
                        dragStartRef.current = {
                          x: e.clientX,
                          y: e.clientY,
                          width: sel.width ?? 100,
                          height: sel.height ?? 100,
                        };
                        setDraggingElementId(sel.id);
                      }}
                      captureMode={captureMode}
                      boundsPercent={effectiveArea}
                    />
                  );
                })()}

              {/* Kırp modu: portal ile crop çerçevesi + tutamaclar + toolbar */}
              {cropSel &&
                onCropRegionChange &&
                onCropConfirm &&
                onCropCancel &&
                (() => {
                  const sel = cropSel;
                  const w = sel.width ?? 100;
                  const h = sel.height ?? 100;
                  const rotation = (sel.rotation ?? 0) * (Math.PI / 180);
                  const cos = Math.cos(rotation);
                  const sin = Math.sin(rotation);
                  const cx = stageRect!.left + (sel.x / 100) * stageRect!.width;
                  const cy = stageRect!.top + (sel.y / 100) * stageRect!.height;
                  const corner = (dx: number, dy: number) => ({
                    x: cx + (dx * cos - dy * sin),
                    y: cy + (dx * sin + dy * cos),
                  });
                  const cropLeftPx = (cropRegion.left / 100) * w - w / 2;
                  const cropTopPx = (cropRegion.top / 100) * h - h / 2;
                  const cropW = (cropRegion.width / 100) * w;
                  const cropH = (cropRegion.height / 100) * h;
                  const cnw = corner(cropLeftPx, cropTopPx);
                  const cne = corner(cropLeftPx + cropW, cropTopPx);
                  const cse = corner(cropLeftPx + cropW, cropTopPx + cropH);
                  const csw = corner(cropLeftPx, cropTopPx + cropH);
                  const cropMid = { n: { x: (cnw.x + cne.x) / 2, y: (cnw.y + cne.y) / 2 }, e: { x: (cne.x + cse.x) / 2, y: (cne.y + cse.y) / 2 }, s: { x: (csw.x + cse.x) / 2, y: (csw.y + cse.y) / 2 }, w: { x: (cnw.x + csw.x) / 2, y: (cnw.y + csw.y) / 2 } };
                  const cropHandles: Array<{ id: CropHandle; x: number; y: number }> = [
                    { id: "nw", x: cnw.x, y: cnw.y }, { id: "n", x: cropMid.n.x, y: cropMid.n.y }, { id: "ne", x: cne.x, y: cne.y },
                    { id: "e", x: cropMid.e.x, y: cropMid.e.y }, { id: "se", x: cse.x, y: cse.y }, { id: "s", x: cropMid.s.x, y: cropMid.s.y },
                    { id: "sw", x: csw.x, y: csw.y }, { id: "w", x: cropMid.w.x, y: cropMid.w.y },
                  ];
                  const cropCenterY = (cnw.y + cse.y) / 2;
                  const cropCenterX = (cnw.x + cse.x) / 2;
                  const HANDLE_SIZE = 10;
                  return createPortal(
                    <>
                      <div
                        className="pointer-events-none border-2 border-dashed border-sky-400 bg-sky-400/5"
                        style={{
                          position: "fixed",
                          left: cropCenterX - cropW / 2,
                          top: cropCenterY - cropH / 2,
                          width: cropW,
                          height: cropH,
                          transform: `rotate(${sel.rotation ?? 0}deg)`,
                          transformOrigin: "50% 50%",
                        }}
                      />
                      {cropHandles.map(({ id, x, y }) => (
                        <div
                          key={id}
                          className="border border-white bg-sky-400 pointer-events-auto shadow-md hover:bg-sky-500 cursor-move"
                          style={{
                            position: "fixed",
                            left: x - HANDLE_SIZE / 2,
                            top: y - HANDLE_SIZE / 2,
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCroppingHandle(id);
                            cropDragStartRef.current = { region: { ...cropRegion }, clientX: e.clientX, clientY: e.clientY };
                          }}
                          aria-label={`Kırp ${id}`}
                        />
                      ))}
                      <div
                        className="flex items-center gap-0.5 rounded-lg bg-white shadow-md border border-border pointer-events-auto"
                        style={{
                          position: "fixed",
                          left: cropCenterX - 44,
                          top: cropCenterY - cropH / 2 - 36,
                          width: 56,
                          height: 28,
                        }}
                      >
                        <button type="button" className="flex-1 flex items-center justify-center h-full rounded-l-md hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCropCancel(); }} aria-label="Kırpmayı iptal et">
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button type="button" className="flex-1 flex items-center justify-center h-full rounded-r-md hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCropConfirm(sel.id, cropRegion); }} aria-label="Kırp">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </>,
                    portalRootRef.current
                  );
                })()}

              {/* Always-visible print area hint + optional grid + anlık ölçü (captureMode'da gizle) */}
              {!captureMode && !isEditingPrintArea && hasVisiblePrintArea ? (
                <div
                  className="absolute rounded-md border border-dashed border-primary/70 bg-primary/5 pointer-events-none"
                  style={{
                    left: `${effectiveArea.left}%`,
                    top: `${effectiveArea.top}%`,
                    width: `${effectiveArea.width}%`,
                    height: `${effectiveArea.height}%`,
                  }}
                >
                  {/* Köşelerde ölçü bilgisi */}
                  <div className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
                    L {Math.round(effectiveArea.left)}% · T {Math.round(effectiveArea.top)}%
                  </div>
                  <div className="absolute right-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
                    W {Math.round(effectiveArea.width)}%
                  </div>
                  <div className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm">
                    H {Math.round(effectiveArea.height)}%
                  </div>
                  <div className="absolute bottom-1 right-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary-foreground shadow-sm">
                    {Math.round(effectiveArea.width)}% × {Math.round(effectiveArea.height)}%
                  </div>
                  {printAreaDimensionsCm ? (() => {
                    const hasRef = printAreaDimensionsCm.width_pct != null && printAreaDimensionsCm.height_pct != null && printAreaDimensionsCm.width_pct > 0 && printAreaDimensionsCm.height_pct > 0;
                    const liveW = hasRef ? (effectiveArea.width / printAreaDimensionsCm.width_pct!) * printAreaDimensionsCm.width_cm : printAreaDimensionsCm.width_cm;
                    const liveH = hasRef ? (effectiveArea.height / printAreaDimensionsCm.height_pct!) * printAreaDimensionsCm.height_cm : printAreaDimensionsCm.height_cm;
                    const fmtCm = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
                    return (
                      <div className="absolute left-1/2 bottom-1 -translate-x-1/2 rounded bg-background/95 px-2 py-1 text-[11px] font-medium tabular-nums text-foreground shadow-sm border border-border">
                        {fmtCm(liveW)} × {fmtCm(liveH)} cm
                      </div>
                    );
                  })() : null}
                  {showGrid ? (
                    <div
                      className="absolute inset-0 opacity-50 text-primary/60"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, currentColor 1px, transparent 1px),
                          linear-gradient(to bottom, currentColor 1px, transparent 1px)
                        `,
                        backgroundSize: "5% 5%",
                      }}
                      aria-hidden
                    />
                  ) : null}
                </div>
              ) : null}

              {/* Print area overlay (editable) */}
              {!captureMode && isEditingPrintArea && canEditPrintArea && (draftArea ?? hasVisiblePrintArea) ? (
                <div className="absolute inset-0">
                  <PrintAreaOverlay
                    value={effectiveArea}
                    onChange={(v) => setDraftArea(v)}
                    dimensionsCm={printAreaDimensionsCm}
                  />
                </div>
              ) : null}

              {/* Saving overlay */}
              {isSavingMockup ? (
                <div className="absolute inset-0 flex items-end">
                  <div className="w-full p-3">
                    <div className="rounded-lg border border-border bg-background/80 backdrop-blur px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{saveStatusText ?? "Kaydediliyor…"}</span>
                        <span className="ml-auto tabular-nums">{Math.round(saveProgress)}%</span>
                      </div>
                      <Progress value={saveProgress} className="mt-2" />
                    </div>
                  </div>
                </div>
              ) : null}

            </div>

          </div>

          {/* Actions - z-20 ve pointer-events-auto ile canvas/overlay üstünde tıklanabilir kalsın */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2 pointer-events-auto">
            {/* Baskı alanı içine tasarım görseli yükle (baskı alanı üzerinde, içinde yer alacak) */}
            {hasVisiblePrintArea && !isEditingPrintArea && onPickFileForDesign ? (
              <>
                <input
                  ref={designFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPickFileForDesign(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => designFileInputRef.current?.click()}
                  title="Baskı alanı içine eklenecek görseli seçin; görsel baskı alanı üzerinde yer alır ve boyutu düzenlenebilir."
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Görsel yükle
                </Button>
              </>
            ) : null}
            {/* İsteğe bağlı zemin mockup'ı; baskı alanı oluşturucu ile birlikte her zaman göster (önce mockup veya önce baskı alanı oluşturulabilir) */}
            {!isEditingPrintArea && onPickFileForView && activeViewId ? (
              <>
                <input
                  ref={mockupFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPickFileForView(activeViewId, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={isSavingMockup}
                  onClick={() => mockupFileInputRef.current?.click()}
                  title="Bu görünüm için zemin mockup'ı (ürün fotoğrafı) yükler. Giyim gibi kategorilerde kullanılır; sadece baskı alanı yeterli olan ürünlerde isteğe bağlıdır."
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Mockup yükle
                </Button>
              </>
            ) : null}
            {mockupImage && !mockupImage.startsWith("blob:") && onRemoveMockup ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isSavingMockup}
                onClick={onRemoveMockup}
                title="Bu görünümün mockup görselini kaldırır"
                aria-label="Mockup'u kaldır"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Mockup'u kaldır
              </Button>
            ) : null}
            {canSaveOrCancel ? (
              <>
                <Button
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={onSaveMockup}
                  disabled={isSavingMockup}
                  title="Yüklediğiniz mockup görselini bu görünüme kalıcı kaydeder (artık her açılışta görünür)"
                >
                  {isSavingMockup ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Kaydet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={onCancelMockup}
                  disabled={isSavingMockup}
                >
                  <X className="h-4 w-4" />
                  İptal
                </Button>
              </>
            ) : null}

            {onClearDesignImages && designElements.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={isSavingMockup}
                onClick={onClearDesignImages}
                title="Görseli sil"
                aria-label="Görseli sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            {onOpenPrintAreaCreator ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={isSavingMockup}
                onClick={onOpenPrintAreaCreator}
              >
                <Ruler className="h-4 w-4 mr-1" />
                Baskı alanı oluşturucu
              </Button>
            ) : null}
            {onResetPrintArea && hasVisiblePrintArea ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isSavingMockup}
                onClick={onResetPrintArea}
                title="Baskı alanını kaldırır; oluşturucu ile yeniden ekleyebilirsiniz"
              >
                <Eraser className="h-4 w-4 mr-1" />
                Baskı alanını sil
              </Button>
            ) : null}

            {/* Kilidi aç: baskı alanı kilitliyken düzenleme moduna geçer */}
            {hasVisiblePrintArea && !isEditingPrintArea && canEditPrintArea ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={isSavingMockup}
                onClick={() => {
                  setDraftArea(printArea ?? null);
                  setIsEditingPrintArea(true);
                }}
                title="Baskı alanı kilidini aç; taşıyıp boyutlandırabilirsiniz"
                aria-label="Kilidi aç"
              >
                <LockOpen className="h-4 w-4" />
              </Button>
            ) : null}

            {isEditingPrintArea && canEditPrintArea ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={isSavingMockup}
                  onClick={() => {
                    const cur = draftArea ?? (printArea ?? { left: 30, top: 30, width: 40, height: 40 });
                    const w = cur.width;
                    const h = cur.height;
                    setDraftArea({
                      left: Math.max(0, (100 - w) / 2),
                      top: Math.max(0, (100 - h) / 2),
                      width: w,
                      height: h,
                    });
                  }}
                  title="Baskı alanını alanın ortasına hizalar"
                >
                  <AlignCenterHorizontal className="h-4 w-4 mr-1" />
                  Ortala
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={!canSavePrintArea || isSavingMockup}
                  onClick={() => {
                    if (!draftArea) return;
                    onSavePrintArea?.(draftArea);
                    setIsEditingPrintArea(false);
                    setDraftArea(null);
                  }}
                  title="Kaydeder ve baskı alanını kilitler"
                  aria-label="Alanı kaydet ve kilitle"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Kaydet ve kilitle
                </Button>
              </>
            ) : null}
          </div>

          {!canEditPrintArea && disablePrintAreaEdit ? (
            <div className="absolute left-3 top-3 rounded-lg border border-border bg-background/80 backdrop-blur px-3 py-2 text-xs text-muted-foreground">
              Baskı alanı için önce mockup kaydet.
            </div>
          ) : null}
        </div>
      </div>

      {/* Görünüm butonları: mockup alanının altında yer alır */}
      <div className="shrink-0 z-10 px-3 pb-4 pt-2 flex justify-center overflow-x-auto bg-white border-t border-border">
        <ViewSwitcher views={views} activeViewId={activeViewId} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
