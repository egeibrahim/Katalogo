import { useState, useCallback, useEffect, useRef } from "react";
import { DesignElement } from "@/components/designer/types";

interface HistoryState {
  elements: DesignElement[];
}

export function useDesignHistory(initialElements: DesignElement[]) {
  const [history, setHistory] = useState<HistoryState[]>([{ elements: initialElements }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const historyRef = useRef(history);
  const indexRef = useRef(currentIndex);

  // Keep refs in sync
  useEffect(() => {
    historyRef.current = history;
    indexRef.current = currentIndex;
  }, [history, currentIndex]);

  const elements = history[currentIndex]?.elements || initialElements;

  const setElements = useCallback((newElements: DesignElement[] | ((prev: DesignElement[]) => DesignElement[])) => {
    const currentHistory = historyRef.current;
    const currentIdx = indexRef.current;
    const current = currentHistory[currentIdx]?.elements || [];
    const updated = typeof newElements === "function" ? newElements(current) : newElements;
    
    // Remove any future states when making a new change
    let newHistory = currentHistory.slice(0, currentIdx + 1);
    newHistory.push({ elements: updated });
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory = newHistory.slice(1);
    }
    
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, []);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < historyRef.current.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Reset elements function (for loading saved designs)
  const resetElements = useCallback((newElements: DesignElement[]) => {
    setHistory([{ elements: newElements }]);
    setCurrentIndex(0);
  }, []);

  return {
    elements,
    setElements,
    resetElements,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
