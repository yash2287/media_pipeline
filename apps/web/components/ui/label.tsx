import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]",
        className,
      )}
      {...props}
    />
  );
}
