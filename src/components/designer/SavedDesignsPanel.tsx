import { useState, useEffect } from "react";
import { Trash2, Download, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SavedDesign, DesignElement } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface SavedDesignsPanelProps {
  onLoadDesign: (designData: Record<string, DesignElement[]>, productId: string) => void;
}

export function SavedDesignsPanel({ onLoadDesign }: SavedDesignsPanelProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("saved_designs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data && !error) {
      // Transform the data to match our type
      const transformedDesigns: SavedDesign[] = data.map((d) => ({
        ...d,
        design_data: d.design_data as unknown as Record<string, DesignElement[]>,
        product_id: d.product_id || undefined,
        thumbnail_url: d.thumbnail_url || undefined,
      }));
      setDesigns(transformedDesigns);
    }
    setIsLoading(false);
  };

  const handleLoad = (design: SavedDesign) => {
    onLoadDesign(design.design_data, design.product_id || "");
    toast.success(`Loaded: ${design.name}`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("saved_designs")
      .delete()
      .eq("id", id);

    if (!error) {
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      toast.success("Design deleted");
    } else {
      toast.error("Failed to delete design");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border bg-card">
        <h3 className="text-sm font-semibold leading-none">Saved Designs</h3>
        <p className="text-xs text-muted-foreground mt-1">Your previously saved designs</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {designs.map((design) => (
            <div
              key={design.id}
              className="border rounded-lg p-3 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{design.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(design.updated_at), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleLoad(design)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(design.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {design.thumbnail_url && (
                <div className="mt-2">
                  <img
                    src={design.thumbnail_url}
                    alt={design.name}
                    className="w-full h-20 object-contain rounded bg-muted"
                  />
                </div>
              )}
            </div>
          ))}

          {designs.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">No saved designs</p>
              <p className="text-xs mt-1">Your designs will appear here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
