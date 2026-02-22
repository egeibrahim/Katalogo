import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Preline UI card – https://preline.co/docs/card.html
 * Fixed layout: rounded-xl, border, shadow, consistent padding.
 */
const PrelineCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  )
);
PrelineCard.displayName = "PrelineCard";

const PrelineCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4", className)} {...props} />
  )
);
PrelineCardHeader.displayName = "PrelineCardHeader";

const PrelineCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold text-gray-800", className)} {...props} />
  )
);
PrelineCardTitle.displayName = "PrelineCardTitle";

const PrelineCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
  )
);
PrelineCardDescription.displayName = "PrelineCardDescription";

const PrelineCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  )
);
PrelineCardContent.displayName = "PrelineCardContent";

const PrelineCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 p-4 pt-0", className)} {...props} />
  )
);
PrelineCardFooter.displayName = "PrelineCardFooter";

export {
  PrelineCard,
  PrelineCardHeader,
  PrelineCardTitle,
  PrelineCardDescription,
  PrelineCardContent,
  PrelineCardFooter,
};
