import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Preline UI dropdown – exact structure from https://preline.co/plugins/html/dropdown.html
 * Menu width fixed to w-48 so it never gets overly wide.
 * Preline JS (autoInit) wires toggle/menu; ensure PrelineInit runs on route change.
 */
export interface PrelineDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  menuClassName?: string;
  placement?: "bottom" | "bottom-left" | "bottom-right" | "top" | "top-left" | "top-right";
}

const placementClass: Record<string, string> = {
  bottom: "[--placement:bottom]",
  "bottom-left": "[--placement:bottom-left]",
  "bottom-right": "[--placement:bottom-right]",
  top: "[--placement:top]",
  "top-left": "[--placement:top-left]",
  "top-right": "[--placement:top-right]",
};

export function PrelineDropdown({
  trigger,
  children,
  className,
  menuClassName,
  placement = "bottom",
}: PrelineDropdownProps) {
  const id = React.useId().replace(/:/g, "-");
  return (
    <div
      className={cn("hs-dropdown relative inline-flex", placementClass[placement], className)}
      data-hs-dropdown
    >
      <button
        type="button"
        id={`hs-dropdown-${id}`}
        className="hs-dropdown-toggle inline-flex justify-center items-center gap-x-2 rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        aria-expanded="false"
        aria-label="Menu"
      >
        {trigger}
      </button>
      <div
        className={cn(
          "hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden z-[1] mt-2 min-w-48 w-48 bg-white border border-gray-200 rounded-lg shadow-md py-1",
          menuClassName
        )}
        role="menu"
        aria-labelledby={`hs-dropdown-${id}`}
      >
        {children}
      </div>
    </div>
  );
}

export function PrelineDropdownItem({
  children,
  onClick,
  className,
  as: Comp = "button",
  ...rest
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  as?: "button" | "a";
  [k: string]: unknown;
}) {
  const base = "flex w-full items-center gap-x-2 py-2 px-3 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-left rounded-none";
  if (Comp === "a") {
    return (
      <a className={cn(base, className)} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cn(base, className)} onClick={onClick} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
