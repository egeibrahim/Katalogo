import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Preline UI select – native <select> with Preline styling.
 * Wrapper is max-w-sm by default so dropdowns are never overly wide.
 * https://preline.co/docs/select.html
 */
export interface PrelineSelectOption {
  value: string;
  label: string;
}

export interface PrelineSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: React.ReactNode;
  options: PrelineSelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

const PrelineSelect = React.forwardRef<HTMLSelectElement, PrelineSelectProps>(
  ({ label, options, placeholder, wrapperClassName, className, id: idProp, ...props }, ref) => {
    const id = idProp ?? React.useId();
    return (
      <div className={cn("space-y-1 max-w-sm", wrapperClassName)}>
        {label ? (
          <label htmlFor={id} className="block text-sm font-medium text-gray-800">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={id}
          className={cn(
            "py-2 px-3 block w-full rounded-lg border border-gray-200 bg-white text-sm",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {placeholder ? (
            <option value="">{placeholder}</option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
PrelineSelect.displayName = "PrelineSelect";

export { PrelineSelect };
