import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Preline UI button – https://preline.co/docs/buttons.html
 * Uses exact Preline Tailwind classes; fixed sizes so layout stays consistent.
 */
const sizeClasses = {
  default: "py-2 px-4 text-sm",
  sm: "py-1.5 px-2.5 text-xs",
  lg: "py-2.5 px-6 text-sm",
  icon: "p-2 size-9",
} as const;

const variantClasses = {
  default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  outline: "border border-gray-200 bg-white text-gray-800 hover:bg-gray-100 focus:ring-gray-200",
  ghost: "text-gray-800 hover:bg-gray-100 focus:ring-gray-200",
  destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-200",
};

export interface PrelineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  children?: React.ReactNode;
  className?: string;
}

const PrelineButton = React.forwardRef<HTMLButtonElement, PrelineButtonProps>(
  ({ variant = "default", size = "default", className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-x-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
PrelineButton.displayName = "PrelineButton";

export { PrelineButton };
