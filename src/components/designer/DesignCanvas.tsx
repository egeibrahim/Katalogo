import { useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/ui/signed-image";
import { DesignElement, ProductView, DEFAULT_FONT_FAMILY } from "./types";

interface DesignCanvasProps {
  elements: DesignElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  onSelectionChange: (selectedIds: string[], primaryId: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentView?: ProductView;
  mockupImage: string;
  productColor: string;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;

export function DesignCanvas({
  elements,
  selectedElementId,
  selectedElementIds,
  onSelectionChange,
  onUpdateElement,
  zoom,
  onZoomChange,
  currentView,
  mockupImage,
  productColor,
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [rotationCenter, setRotationCenter] = useState({ x: 0, y: 0 });

  const designArea = currentView
    ? {
        top: Number(currentView.design_area_top),
        left: Number(currentView.design_area_left),
        width: Number(currentView.design_area_width),
        height: Number(currentView.design_area_height),
      }
    : { top: 25, left: 25, width: 50, height: 40 };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectionChange([], null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find((el) => el.id === elementId);
    if (element?.isLocked) return;

    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    if (e.shiftKey) {
      const exists = selectedElementIds.includes(elementId);
      const nextIds = exists
        ? selectedElementIds.filter((id) => id !== elementId)
        : [...selectedElementIds, elementId];

      const nextPrimary =
        selectedElementId === elementId
          ? nextIds[0] ?? null
          : selectedElementId ?? elementId;

      onSelectionChange(nextIds, nextPrimary);
      return;
    }

    onSelectionChange([elementId], elementId);
    setIsDragging(true);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: ResizeHandle) => {
    e.stopPropagation();
    const element = elements.find((el) => el.id === elementId);
    if (!element || element.isLocked) return;

    setIsResizing(handle);
    setInitialSize({
      width: element.width || 100,
      height: element.height || 100,
    });
    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  const handleRotateStart = (e: React.MouseEvent, elementId: string, element: DesignElement) => {
    e.stopPropagation();
    if (element.isLocked || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + (element.x / 100) * rect.width;
    const centerY = rect.top + (element.y / 100) * rect.height;

    setIsRotating(true);
    setRotationCenter({ x: centerX, y: centerY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectedElementId || !canvasRef.current) return;

    const element = elements.find((el) => el.id === selectedElementId);
    if (!element || element.isLocked) return;

    if (isRotating) {
      const angle = Math.atan2(e.clientY - rotationCenter.y, e.clientX - rotationCenter.x);
      const degrees = (angle * 180) / Math.PI + 90;
      onUpdateElement(selectedElementId, { rotation: Math.round(degrees) });
      return;
    }

    if (isResizing) {
      const deltaX = e.clientX - dragOffset.x;
      const deltaY = e.clientY - dragOffset.y;
      
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;

      if (isResizing.includes("e")) {
        newWidth = Math.max(20, initialSize.width + deltaX);
      }
      if (isResizing.includes("w")) {
        newWidth = Math.max(20, initialSize.width - deltaX);
      }
      if (isResizing.includes("s")) {
        newHeight = Math.max(20, initialSize.height + deltaY);
      }
      if (isResizing.includes("n")) {
        newHeight = Math.max(20, initialSize.height - deltaY);
      }

      onUpdateElement(selectedElementId, { width: newWidth, height: newHeight });
      return;
    }

    if (isDragging) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      const clampedX = Math.max(10, Math.min(90, x));
      const clampedY = Math.max(10, Math.min(90, y));

      onUpdateElement(selectedElementId, { x: clampedX, y: clampedY });
    }
  }, [isDragging, isResizing, isRotating, selectedElementId, dragOffset, initialSize, rotationCenter, onUpdateElement, elements]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
    setIsRotating(false);
  };

  const getElementStyle = (element: DesignElement) => ({
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
  });

  const getTextStyle = (element: DesignElement) => ({
    fontSize: element.fontSize || 24,
    color: element.color || "#000000",
    fontFamily: element.fontFamily || DEFAULT_FONT_FAMILY,
    fontWeight: element.fontWeight || "normal",
    fontStyle: element.fontStyle || "normal",
    textDecoration: element.textDecoration || "none",
    textAlign: element.textAlign || "center",
  });

  return (
    <div className="flex-1 canvas-area flex flex-col">
      {/* Canvas Toolbar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentView?.view_name || "Design"} View
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-2" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(100)}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 flex items-center justify-center p-8 overflow-auto"
        style={{ backgroundColor: "hsl(var(--canvas-bg))" }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={canvasRef}
          id="design-canvas"
          className="relative bg-card rounded-lg shadow-designer-lg transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom / 100})`,
            backgroundColor: productColor,
          }}
        >
          {/* Product Mockup */}
          <img
            src={mockupImage}
            alt="Product Mockup"
            className="w-[400px] h-auto select-none"
            draggable={false}
            onError={(e) => {
              // Fallback in case a remote mockup fails to load
              e.currentTarget.style.display = "none";
            }}
          />

          {/* Design Area with Clipping - elements outside won't show */}
          <div 
            className="absolute overflow-hidden"
            style={{
              top: `${designArea.top}%`,
              left: `${designArea.left}%`,
              width: `${designArea.width}%`,
              height: `${designArea.height}%`,
            }}
          >
            {/* Design Elements - clipped to design area */}
            {elements.map((element) => {
              const isSelected = selectedElementIds.includes(element.id);
              const isPrimary = selectedElementId === element.id;
              const isLocked = element.isLocked === true;
              
              // Calculate position relative to design area
              const relativeX = ((element.x - designArea.left) / designArea.width) * 100;
              const relativeY = ((element.y - designArea.top) / designArea.height) * 100;
              
              return (
                <div
                  key={element.id}
                  className={`absolute transition-shadow ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:ring-2 hover:ring-primary/50"
                  } ${isDragging && isPrimary ? "cursor-grabbing" : isLocked ? "cursor-not-allowed" : "cursor-grab"}`}
                  style={{
                    left: `${relativeX}%`,
                    top: `${relativeY}%`,
                    transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg) scale(${element.scaleX ?? 1}, ${element.scaleY ?? 1})`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                >
                  {element.type === "text" && (
                    <span
                      style={getTextStyle(element)}
                      className="whitespace-nowrap select-none block"
                    >
                      {element.content}
                    </span>
                  )}
                  {element.type === "image" && element.imageUrl && (
                    element.imageUrl.startsWith("blob:") ? (
                      <img
                        src={element.imageUrl}
                        alt="Design element"
                        style={{ width: element.width || 100, height: element.height || 100 }}
                        className="object-contain select-none"
                        draggable={false}
                      />
                    ) : (
                      <SignedImage
                        src={element.imageUrl}
                        alt="Design element"
                        className="object-contain select-none"
                        style={{ width: element.width || 100, height: element.height || 100 }}
                        draggable={false}
                      />
                    )
                  )}

                  {/* Resize Handles */}
                  {isPrimary && !isLocked && (
                    <>
                      <div
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-nw-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, "nw")}
                      />
                      <div
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-ne-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, "ne")}
                      />
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-sm cursor-sw-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, "sw")}
                      />
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-sm cursor-se-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, "se")}
                      />
                      
                      {/* Rotation handle */}
                      <div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full cursor-grab flex items-center justify-center"
                        onMouseDown={(e) => handleRotateStart(e, element.id, element)}
                      >
                        <div className="absolute top-4 w-px h-4 bg-primary" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Design Area Border Overlay - striped/dashed */}
          <div 
            className="absolute rounded-lg pointer-events-none"
            style={{
              top: `${designArea.top}%`,
              left: `${designArea.left}%`,
              width: `${designArea.width}%`,
              height: `${designArea.height}%`,
              border: '2px dashed hsl(var(--primary) / 0.5)',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, hsl(var(--primary) / 0.05) 5px, hsl(var(--primary) / 0.05) 10px)',
            }}
          />

        </div>
      </div>
    </div>
  );
}
