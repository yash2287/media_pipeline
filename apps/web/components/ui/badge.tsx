import type { HTMLAttributes } from "react";
import { cn, titleCase } from "@/lib/utils";

const styles: Record<string, string> = {
  review: "bg-[var(--amber-soft)] text-[var(--amber)]",
  running: "bg-[var(--purple-soft)] text-[var(--purple)]",
  delivered: "bg-[var(--teal-soft)] text-[var(--teal)]",
  intake: "bg-stone-100 text-stone-700",
  failed: "bg-red-50 text-red-700",
  approved: "bg-[var(--teal-soft)] text-[var(--teal)]",
  rejected: "bg-red-50 text-red-700",
  manual_fix: "bg-[var(--amber-soft)] text-[var(--amber)]",
  pending: "bg-stone-100 text-stone-700",
  queued: "bg-stone-100 text-stone-700",
  succeeded: "bg-[var(--teal-soft)] text-[var(--teal)]",
  skipped: "bg-stone-100 text-stone-700",
};

export function Badge({
  className,
  value,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { value?: string }) {
  const label = value ?? String(children ?? "");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        styles[label] ?? "bg-stone-100 text-stone-700",
        className,
      )}
      {...props}
    >
      {children ?? titleCase(label)}
    </span>
  );
}

