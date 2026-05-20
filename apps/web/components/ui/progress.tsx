import { cn } from "@/lib/utils";

export function Progress({
  value,
  indeterminate,
  className,
  tone = "accent",
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
  tone?: "accent" | "teal" | "ink";
}) {
  const toneClass =
    tone === "teal"
      ? "bg-[var(--teal)]"
      : tone === "ink"
      ? "bg-[var(--ink)]"
      : "bg-[var(--accent)]";

  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("stage-line h-[6px] w-full", className)}
    >
      {indeterminate ? (
        <span className="flow" />
      ) : (
        <span
          className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", toneClass)}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
