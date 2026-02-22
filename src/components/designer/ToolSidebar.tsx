import { Type, Upload, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ActiveTab } from "./types";

interface ToolSidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const tabs: { id: ActiveTab; icon: typeof Upload; label: string; tooltip?: string }[] = [
  { id: "upload", icon: Upload, label: "Görsel", tooltip: "Tasarım görselleri — baskı alanına eklenir (mockup zemin değil)" },
  { id: "text", icon: Type, label: "Text" },
  { id: "layers", icon: Layers, label: "Katmanlar" },
];

export function ToolSidebar({ activeTab, onTabChange }: ToolSidebarProps) {
  const visibleTabs = tabs;

  return (
    <aside className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-1">
      <TooltipProvider delayDuration={200}>
        {visibleTabs.map((tab) => (
          <div key={tab.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === tab.id ? "secondary" : "ghost"}
                  size="icon"
                  className="w-12 h-12"
                  onClick={() => onTabChange(tab.id)}
                >
                  <tab.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tab.tooltip ?? tab.label}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </TooltipProvider>
    </aside>
  );
}
