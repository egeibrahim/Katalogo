import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    HSStaticMethods?: { autoInit: (collection?: string | string[]) => void };
  }
}

/**
 * Preline UI (preline.co) bileşenlerinin dropdown, tab, overlay, collapse vb.
 * davranışları için JS init. Route değişiminde tekrar çalıştırılır.
 * autoInit() argümansız veya 'all' ile çağrılmalı; document.body geçmek overlay'ı bozar.
 */
export function PrelineInit() {
  const { pathname } = useLocation();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    import("preline/dist/preline.js").then(() => {
      window.HSStaticMethods?.autoInit?.();
      // Route değişiminde DOM bazen gecikmeli render olduğu için overlay/trigger'ları tekrar tarıyoruz
      timeoutId = setTimeout(() => window.HSStaticMethods?.autoInit?.(), 100);
    });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
