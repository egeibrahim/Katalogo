import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Preline UI input + label – https://preline.co/docs/input.html
 * Wrapper supports max-w-* to prevent oversized fields.
 */
export interface PrelineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: boolean;
  wrapperClassName?: string;
}

const PrelineInput = React.forwardRef<HTMLInputElement, PrelineInputProps>(
  ({ label, error, wrapperClassName, className, id: idProp, ...props }, ref) => {
    const id = idProp ?? React.useId();
    return (
      <div className={cn("space-y-1", wrapperClassName)}>
        {label ? (
          <label htmlFor={id} className="block text-sm font-medium text-gray-800">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            "py-2 px-3 block w-full rounded-lg border text-sm",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            error
              ? "border-red-500 bg-red-50/50"
              : "border-gray-200 bg-white",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
PrelineInput.displayName = "PrelineInput";

export { PrelineInput };
