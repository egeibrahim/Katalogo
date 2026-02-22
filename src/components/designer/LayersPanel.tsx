import { Trash2, Eye, EyeOff, Lock, Unlock, Type, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DesignElement } from "./types";
import { AttributesPanel } from "./AttributesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LayersPanelProps {
  elements: DesignElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  onSelectionChange: (selectedIds: string[], primaryId: string | null) => void;
  onDeleteElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
}

export function LayersPanel({
  elements,
  selectedElementId,
  selectedElementIds,
  onSelectionChange,
  onDeleteElement,
  onUpdateElement,
}: LayersPanelProps) {
  const selectedElementData = elements.find((el) => el.id === selectedElementId) || null;

  const handleUpdateSelected = (updates: Partial<DesignElement>) => {
    if (selectedElementId) {
      onUpdateElement(selectedElementId, updates);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="layers" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2 p-2">
          <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
          <TabsTrigger value="attributes" className="text-xs" disabled={!selectedElementId}>
            Attributes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="flex-1 m-0">
          <div className="px-3 py-3 border-b border-border bg-card">
            <h3 className="text-sm font-semibold leading-none">Layers</h3>
            <p className="text-xs text-muted-foreground mt-1">{elements.length} elements</p>
          </div>
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="p-2 space-y-1">
              {[...elements].reverse().map((element) => {
                const isSelected = selectedElementIds.includes(element.id);
                const isVisible = element.isVisible !== false;
                const isLocked = element.isLocked === true;

                return (
                  <div
                    key={element.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent border border-transparent"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      const isShift = (e as unknown as MouseEvent).shiftKey;

                      if (isShift) {
                        const exists = selectedElementIds.includes(element.id);
                        const nextIds = exists
                          ? selectedElementIds.filter((id) => id !== element.id)
                          : [...selectedElementIds, element.id];

                        const nextPrimary =
                          selectedElementId === element.id ? nextIds[0] ?? null : selectedElementId ?? element.id;

                        onSelectionChange(nextIds, nextPrimary);
                        return;
                      }

                      onSelectionChange([element.id], element.id);
                    }}
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      {element.type === "text" ? (
                        <Type className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Image className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{element.content}</p>
                      <span className="text-xs text-muted-foreground capitalize">{element.type}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElement(element.id, { isVisible: !isVisible });
                        }}
                      >
                        {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElement(element.id, { isLocked: !isLocked });
                        }}
                      >
                        {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteElement(element.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {elements.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No layers yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="attributes" className="flex-1 m-0 overflow-auto">
          <AttributesPanel element={selectedElementData} onUpdate={handleUpdateSelected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
