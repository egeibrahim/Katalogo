import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type CropRect = { left: number; top: number; width: number; height: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onConfirm: (croppedBlobUrl: string, width: number, height: number) => void;
};

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState<CropRect>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (img && img.naturalWidth) {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  const doCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !imageSize) return;
    const { w: nw, h: nh } = imageSize;
    const x = (crop.left / 100) * nw;
    const y = (crop.top / 100) * nh;
    const w = Math.max(1, (crop.width / 100) * nw);
    const h = Math.max(1, (crop.height / 100) * nh);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsCropping(true);
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        setIsCropping(false);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        onConfirm(url, Math.round(w), Math.round(h));
        onOpenChange(false);
      },
      "image/png",
      0.95
    );
  }, [crop, imageSize, onConfirm, onOpenChange]);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Görseli kırp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative flex justify-center bg-muted/30 rounded-lg overflow-hidden min-h-[200px]">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Kırpılacak"
              className="max-h-[50vh] w-auto object-contain"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            {imageSize && (
              <div
                className="absolute border-2 border-primary pointer-events-none"
                style={{
                  left: `${crop.left}%`,
                  top: `${crop.top}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Sol (%)</Label>
              <Slider
                value={[crop.left]}
                onValueChange={([v]) =>
                  setCrop((p) => ({
                    ...p,
                    left: clamp(v ?? 0),
                    width: clamp(p.width + p.left - (v ?? 0)),
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Üst (%)</Label>
              <Slider
                value={[crop.top]}
                onValueChange={([v]) =>
                  setCrop((p) => ({
                    ...p,
                    top: clamp(v ?? 0),
                    height: clamp(p.height + p.top - (v ?? 0)),
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Genişlik (%)</Label>
              <Slider
                value={[crop.width]}
                onValueChange={([v]) =>
                  setCrop((p) => ({ ...p, width: clamp(v ?? 100) }))
                }
                min={1}
                max={100 - crop.left}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Yükseklik (%)</Label>
              <Slider
                value={[crop.height]}
                onValueChange={([v]) =>
                  setCrop((p) => ({ ...p, height: clamp(v ?? 100) }))
                }
                min={1}
                max={100 - crop.top}
                step={1}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={doCrop} disabled={isCropping || !imageSize}>
            {isCropping ? "Kırpılıyor…" : "Kırp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
