import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  FlipHorizontal,
  FlipVertical,
  Eraser,
  Crop,
  Copy,
  SquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ElementActionsBarProps {
  onAlign: (alignment: string) => void;
  onFlip: (direction: "horizontal" | "vertical") => void;
  onRemoveBg: () => void;
  onCrop: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  elementType: "text" | "image";
  isLocked?: boolean;
}

export function ElementActionsBar({
  onAlign,
  onFlip,
  onRemoveBg,
  onCrop,
  onDuplicate,
  onSaveAsTemplate,
  elementType,
  isLocked = false,
}: ElementActionsBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 h-full">
        {/* Align Popover (Tapstitch-style: 2 rows) */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg hover:bg-muted"
                  disabled={isLocked}
                >
                  <AlignHorizontalJustifyCenter className="h-4 w-4" />
                  <span className="text-xs">Hizala</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{isLocked ? "Kilitli" : "Öğeyi hizala"}</TooltipContent>
          </Tooltip>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-auto p-2 bg-popover border border-border shadow-md z-50"
          >
            {/* Sıra: Align Left, Vertical Align, Align Right, Align Top, Horizontal Align, Bottom Align — justify ikonları (nesne hizalaması) */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("left")}>
                    <AlignHorizontalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sol</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("middle")}>
                    <AlignVerticalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Dikey orta</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("right")}>
                    <AlignHorizontalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sağ</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("top")}>
                    <AlignVerticalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Üst</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("center")}>
                    <AlignHorizontalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Yatay orta</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isLocked} onClick={() => onAlign("bottom")}>
                    <AlignVerticalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Alt</TooltipContent>
              </Tooltip>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border" />

        {/* Flip Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg hover:bg-muted"
                  disabled={isLocked}
                >
                  <FlipHorizontal className="h-4 w-4" />
                  <span className="text-xs">Çevir</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{isLocked ? "Kilitli" : "Çevir"}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="bg-popover border border-border shadow-md z-50">
            <DropdownMenuItem disabled={isLocked} onClick={() => onFlip("horizontal")}>
              <FlipHorizontal className="h-4 w-4 mr-2" />
              Horizontal
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLocked} onClick={() => onFlip("vertical")}>
              <FlipVertical className="h-4 w-4 mr-2" />
              Vertical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border" />

        {/* Remove BG - Only for images */}
        {elementType === "image" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={onRemoveBg}
              >
                <Eraser className="h-4 w-4" />
                <span className="text-xs">Arka planı kaldır</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Arka planı kaldır</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 bg-border" />

        {/* Crop */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={onCrop}>
              <Crop className="h-4 w-4" />
              <span className="text-xs">Kırp</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Öğeyi kırp</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border" />

        {/* Duplicate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
              <span className="text-xs">Çoğalt</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Öğeyi çoğalt</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border" />

        {/* Save as Template */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={onSaveAsTemplate}>
              <SquarePlus className="h-4 w-4" />
              <span className="text-xs">Şablon olarak kaydet</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Şablon olarak kaydet</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
