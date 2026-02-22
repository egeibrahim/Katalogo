import * as React from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    HSOverlay?: {
      open: (target: string | HTMLElement) => void;
      close: (target: string | HTMLElement) => void;
      getInstance: (target: string | HTMLElement, isInstance?: boolean) => { element?: { close: () => void } };
    };
  }
}

/**
 * Preline UI overlay/modal – https://preline.co/plugins/html/overlay.html
 * Trigger has data-hs-overlay="#id"; content in div#id with hs-overlay class.
 * Use PrelineModalTrigger to open and PrelineModalClose to close from inside.
 */
export interface PrelineModalProps {
  id: string;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PrelineModal({ id, title, children, className, contentClassName }: PrelineModalProps) {
  return (
    <div
      id={id}
      className={cn(
        "hs-overlay hidden size-full fixed top-0 start-0 z-[60] overflow-x-hidden overflow-y-auto pointer-events-none",
        className
      )}
      role="dialog"
      tabIndex={-1}
      aria-labelledby={title ? `${id}-label` : undefined}
    >
      <div className="hs-overlay-open:opacity-100 hs-overlay-open:duration-500 opacity-0 transition-all sm:max-w-lg sm:w-full m-3 sm:mx-auto">
        <div className={cn("pointer-events-auto bg-white border border-gray-200 rounded-xl shadow-lg", contentClassName)}>
          {title ? (
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200">
              <h3 id={`${id}-label`} className="text-base font-semibold text-gray-800">
                {title}
              </h3>
              <PrelineModalClose id={id} />
            </div>
          ) : null}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Button that opens the modal. Use asChild to wrap your own button. */
export function PrelineModalTrigger({
  id,
  children,
  asChild,
  className,
}: {
  id: string;
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const triggerProps = {
    "data-hs-overlay": `#${id}`,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": false,
    "aria-controls": id,
    type: "button" as const,
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, triggerProps);
  }
  return (
    <button className={className} {...triggerProps}>
      {children}
    </button>
  );
}

/** Button that closes the modal (call HSOverlay.close). */
export function PrelineModalClose({ id, children, className }: { id: string; children?: React.ReactNode; className?: string }) {
  const close = () => {
    window.HSOverlay?.close?.(`#${id}`);
  };
  return (
    <button
      type="button"
      onClick={close}
      className={cn("inline-flex items-center justify-center size-8 rounded-lg text-gray-500 hover:bg-gray-100", className)}
      aria-label="Close"
    >
      {children ?? (
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}
