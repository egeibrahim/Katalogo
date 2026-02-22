import { useCallback, useEffect, useState } from "react";
import { DesignElement, DesignState } from "@/components/designer/types";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "product-designer-state";

export function useDesignPersistence() {
  const { toast } = useToast();
  const [savedDesigns, setSavedDesigns] = useState<{ name: string; state: DesignState; timestamp: number }[]>([]);

  // Load saved designs list on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + "-list");
      if (saved) {
        setSavedDesigns(JSON.parse(saved));
      }
    } catch {
      console.error("Failed to load saved designs");
    }
  }, []);

  const saveDesign = useCallback((name: string, elements: DesignElement[], productId: string) => {
    try {
      // Filter out image data to reduce storage size
      const lightElements = elements.map(el => ({
        ...el,
        imageUrl: el.type === "image" ? undefined : el.imageUrl, // Don't persist large base64 images
      }));

      const newDesign = {
        name,
        state: { elements: lightElements, productId },
        timestamp: Date.now(),
      };

      setSavedDesigns((prev) => {
        const existing = prev.findIndex((d) => d.name === name);
        let updated;
        if (existing >= 0) {
          updated = [...prev];
          updated[existing] = newDesign;
        } else {
          updated = [...prev, newDesign];
        }
        
        try {
          localStorage.setItem(STORAGE_KEY + "-list", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save designs list", e);
          // Clear storage if quota exceeded
          localStorage.removeItem(STORAGE_KEY + "-list");
          localStorage.removeItem(STORAGE_KEY + "-autosave");
        }
        
        return updated;
      });

      toast({
        title: "Design saved",
        description: `"${name}" has been saved (note: uploaded images are not persisted).`,
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: "Could not save design. Storage may be full.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadDesign = useCallback((name: string): DesignState | null => {
    const design = savedDesigns.find((d) => d.name === name);
    if (design) {
      toast({
        title: "Design loaded",
        description: `"${name}" has been loaded.`,
      });
      return design.state;
    }
    return null;
  }, [savedDesigns, toast]);

  const deleteDesign = useCallback((name: string) => {
    setSavedDesigns((prev) => {
      const updated = prev.filter((d) => d.name !== name);
      try {
        localStorage.setItem(STORAGE_KEY + "-list", JSON.stringify(updated));
      } catch {
        console.error("Failed to update storage");
      }
      return updated;
    });

    toast({
      title: "Design deleted",
      description: `"${name}" has been removed.`,
    });
  }, [toast]);

  // Auto-save current design (lightweight - no images)
  const autoSave = useCallback((elements: DesignElement[], productId: string) => {
    try {
      // Only save text elements and element metadata (not base64 images)
      const lightElements = elements.map(el => ({
        ...el,
        imageUrl: el.type === "image" ? "[image]" : el.imageUrl, // Placeholder for images
      }));
      
      const state: DesignState = { elements: lightElements, productId };
      localStorage.setItem(STORAGE_KEY + "-autosave", JSON.stringify(state));
    } catch (e) {
      // Silently fail or clear old data
      console.warn("Auto-save failed, clearing old data");
      try {
        localStorage.removeItem(STORAGE_KEY + "-autosave");
      } catch {
        // Ignore
      }
    }
  }, []);

  const loadAutoSave = useCallback((): DesignState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + "-autosave");
      if (saved) {
        const state = JSON.parse(saved);
        // Filter out placeholder images
        state.elements = state.elements.filter((el: DesignElement) => 
          el.type !== "image" || (el.imageUrl && el.imageUrl !== "[image]")
        );
        return state;
      }
    } catch {
      console.error("Failed to load auto-save");
    }
    return null;
  }, []);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY + "-list");
      localStorage.removeItem(STORAGE_KEY + "-autosave");
      setSavedDesigns([]);
      toast({
        title: "Storage cleared",
        description: "All saved designs have been removed.",
      });
    } catch {
      console.error("Failed to clear storage");
    }
  }, [toast]);

  return {
    savedDesigns,
    saveDesign,
    loadDesign,
    deleteDesign,
    autoSave,
    loadAutoSave,
    clearStorage,
  };
}
