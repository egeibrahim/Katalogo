import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    HSStaticMethods?: { autoInit: (el?: HTMLElement | Document) => void };
  }
}

/**
 * Preline UI (preline.co) bileşenlerinin dropdown, tab, collapse vb.
 * davranışları için JS init. Route değişiminde tekrar çalıştırılır.
 */
export function PrelineInit() {
  const { pathname } = useLocation();

  useEffect(() => {
    import("preline/dist/preline.js").then(() => {
      window.HSStaticMethods?.autoInit(document.body);
    });
  }, [pathname]);

  return null;
}
