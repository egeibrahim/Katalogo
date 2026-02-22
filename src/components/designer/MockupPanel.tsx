import { useRef } from "react";
import { ImageIcon, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockupPanelProps {
  selectedProductId?: string;
  onProductSelect?: (productId: string) => void;
  /** Ürün galerisi artık mockup alanına taşınmaz; sadece mağaza sayfası için kullanılır. */
  galleryImages?: { image_url: string }[];
  onGalleryImageSelect?: (imageUrl: string) => void;
  /** Seçili görünüm için mockup yükle (dosya seçilince mockup alanında önizleme çıkar, Kaydet ile kalıcı olur). */
  activeViewName?: string;
  onUploadMockup?: (file: File) => void;
}

export function MockupPanel({
  activeViewName,
  onUploadMockup,
  ..._rest
}: MockupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/") && onUploadMockup) {
      onUploadMockup(file);
    }
    e.target.value = "";
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-4 border-b border-border bg-card space-y-2">
        <h3 className="text-sm font-semibold leading-none flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Görünüm mockupları
        </h3>
        <div className="flex gap-2 text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            Mockup görselleri mağaza (ürün) galerisinden değil, yalnızca <strong>görünüm mockuplarından</strong> gelir.
            Her görünüm (Ön, Arka, vb.) için mockup’ı yönetici panelinden yükleyin veya aşağıdaki alandan yükleyip ortadaki mockup alanında Kaydet'e basın.
          </p>
        </div>
      </div>

      {onUploadMockup && (
        <div className="p-3 border-b border-border space-y-2">
          <p className="text-xs text-muted-foreground">
            {activeViewName ? `Seçili görünüm: ${activeViewName}` : "Önce altta bir görünüm seçin (Ön, Arka, vb.)."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Mockup görseli seç"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!activeViewName}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {activeViewName ? "Bu görünüm için mockup yükle" : "Görünüm seçin"}
          </Button>
        </div>
      )}
    </div>
  );
}
