import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] transition-colors",
        "hover:border-[var(--line-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
