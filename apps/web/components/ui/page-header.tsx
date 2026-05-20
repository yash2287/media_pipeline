import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6 animate-fade-up", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="flex items-center gap-2 eyebrow eyebrow-accent">{eyebrow}</div>
        ) : null}
        <h1 className="display mt-2 text-[34px] font-semibold text-[var(--ink)] sm:text-[40px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--ink-3)]">{description}</p>
        ) : null}
        {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
