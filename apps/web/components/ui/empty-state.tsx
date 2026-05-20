import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel-quiet relative grid place-items-center overflow-hidden px-6 py-14 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] grid-bg"
      />
      <div className="relative">
        {icon ? (
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-xs)]">
            {icon}
          </div>
        ) : null}
        <div className="text-[15px] font-semibold text-[var(--ink)]">{title}</div>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-[var(--ink-3)]">{description}</p>
        ) : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
