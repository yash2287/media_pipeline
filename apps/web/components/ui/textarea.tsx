import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm leading-6 text-[var(--ink)] placeholder:text-[var(--muted)] transition-colors",
        "hover:border-[var(--line-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)]",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
