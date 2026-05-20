import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "accent" | "teal" | "amber" | "emerald" | "rose";
  className?: string;
}) {
  const toneAccent =
    tone === "accent"
      ? "before:bg-[var(--accent)]"
      : tone === "teal"
      ? "before:bg-[var(--teal)]"
      : tone === "amber"
      ? "before:bg-[var(--amber)]"
      : tone === "emerald"
      ? "before:bg-[var(--emerald)]"
      : tone === "rose"
      ? "before:bg-[var(--rose)]"
      : "before:bg-[var(--ink)]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-l-[12px]",
        toneAccent,
        className,
      )}
    >
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <span>{label}</span>
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
      </div>
      <div className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)] mono">
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[12px] text-[var(--ink-3)]">{hint}</div> : null}
    </div>
  );
}
