import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontPicker } from "@/components/ui/font-picker";
import { ensureGoogleFontLoaded } from "@/hooks/useGoogleFonts";
import { Bold, Italic, Underline, Plus } from "lucide-react";
import type { DesignElement } from "./types";
import { DEFAULT_FONT_FAMILY } from "./types";

type Props = {
  onAddText: (text: string, style?: Partial<DesignElement>) => void;
  selectedElement: DesignElement | null;
  onUpdateSelectedText: (updates: Partial<DesignElement>) => void;
};

export function TextTemplates(props: Props) {
  const { onAddText, selectedElement, onUpdateSelectedText } = props;
  const [contentDraft, setContentDraft] = useState("");
  const [addFont, setAddFont] = useState(DEFAULT_FONT_FAMILY);

  const isText = selectedElement?.type === "text";
  const content = isText ? (selectedElement?.content ?? "") : contentDraft;
  const font = isText ? (selectedElement?.fontFamily ?? DEFAULT_FONT_FAMILY) : addFont;

  const update = (patch: Partial<DesignElement>) => onUpdateSelectedText(patch);

  const setContent = (v: string) => {
    if (isText) update({ content: v });
    else setContentDraft(v);
  };

  const handleAdd = () => {
    const t = contentDraft.trim() || "Text";
    ensureGoogleFontLoaded(addFont);
    onAddText(t, { fontFamily: addFont, fontSize: 24 });
    setContentDraft("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isText ? "Edit text…" : "Enter text…"}
          className="h-9"
          onKeyDown={(e) => {
            if (!isText && e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
      </div>

      <div className="p-3 border-b">
        <FontPicker
          value={font}
          onChange={isText ? (f) => update({ fontFamily: f }) : setAddFont}
          width={240}
          listHeight={280}
          placeholder="Select font..."
        />
        {!isText && (
          <>
            <Button onClick={handleAdd} className="w-full gap-2 mt-3" size="sm">
              <Plus className="h-4 w-4" />
              Tasarıma ekle
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1.5">İstediğiniz kadar metin ekleyebilirsiniz.</p>
          </>
        )}
      </div>

      {isText && selectedElement && (
        <div className="p-3 border-t space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">Boyut</span>
            <Input
              type="number"
              min={8}
              max={120}
              value={selectedElement.fontSize ?? 24}
              onChange={(e) =>
                update({ fontSize: Math.min(120, Math.max(8, parseInt(e.target.value, 10) || 24)) })
              }
              className="h-8 w-16 text-center text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={selectedElement.fontWeight === "bold" ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => update({ fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" })}
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={selectedElement.fontStyle === "italic" ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => update({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={selectedElement.textDecoration === "underline" ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                update({
                  textDecoration: selectedElement.textDecoration === "underline" ? "none" : "underline",
                })
              }
              aria-label="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">Renk</span>
            <input
              type="color"
              value={selectedElement.color ?? "#000000"}
              onChange={(e) => update({ color: e.target.value })}
              className="h-8 w-8 rounded border cursor-pointer"
              aria-label="Renk"
            />
            <Input
              value={selectedElement.color ?? "#000000"}
              onChange={(e) => update({ color: e.target.value })}
              className="h-8 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
