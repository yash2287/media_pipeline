import type { HTMLAttributes } from "react";
import { cn, titleCase } from "@/lib/utils";

type Tone = {
  bg: string;
  fg: string;
  ring: string;
  dot: string;
};

const tones: Record<string, Tone> = {
  // pipeline / run statuses
  queued:    { bg: "bg-[var(--surface-3)]",   fg: "text-[var(--ink-3)]",       ring: "ring-[var(--line)]",        dot: "bg-[var(--muted)]" },
  running:   { bg: "bg-[var(--accent-soft)]", fg: "text-[var(--accent-ink)]",  ring: "ring-[#dadcff]",            dot: "bg-[var(--accent)]" },
  succeeded: { bg: "bg-[var(--teal-soft)]",   fg: "text-[var(--teal)]",        ring: "ring-[#cce6e2]",            dot: "bg-[var(--teal)]" },
  completed: { bg: "bg-[var(--emerald-soft)]",fg: "text-[var(--emerald)]",     ring: "ring-[#cfeede]",            dot: "bg-[var(--emerald)]" },
  failed:    { bg: "bg-[var(--rose-soft)]",   fg: "text-[var(--rose)]",        ring: "ring-[#f5c7d1]",            dot: "bg-[var(--rose)]" },
  skipped:   { bg: "bg-[var(--surface-3)]",   fg: "text-[var(--ink-3)]",       ring: "ring-[var(--line)]",        dot: "bg-[var(--muted-2)]" },

  // project statuses
  intake:    { bg: "bg-[var(--surface-3)]",   fg: "text-[var(--ink-2)]",       ring: "ring-[var(--line)]",        dot: "bg-[var(--ink-3)]" },
  review:    { bg: "bg-[var(--amber-soft)]",  fg: "text-[var(--amber)]",       ring: "ring-[#f1d7a7]",            dot: "bg-[var(--amber)]" },
  delivered: { bg: "bg-[var(--emerald-soft)]",fg: "text-[var(--emerald)]",     ring: "ring-[#c7ebd9]",            dot: "bg-[var(--emerald)]" },

  // qa statuses
  approved:  { bg: "bg-[var(--teal-soft)]",   fg: "text-[var(--teal)]",        ring: "ring-[#cce6e2]",            dot: "bg-[var(--teal)]" },
  rejected:  { bg: "bg-[var(--rose-soft)]",   fg: "text-[var(--rose)]",        ring: "ring-[#f5c7d1]",            dot: "bg-[var(--rose)]" },
  manual_fix:{ bg: "bg-[var(--amber-soft)]",  fg: "text-[var(--amber)]",       ring: "ring-[#f1d7a7]",            dot: "bg-[var(--amber)]" },
  pending:   { bg: "bg-[var(--surface-3)]",   fg: "text-[var(--ink-3)]",       ring: "ring-[var(--line)]",        dot: "bg-[var(--muted)]" },
};

const liveStatuses = new Set(["running"]);

export function Badge({
  className,
  value,
  children,
  showDot = true,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { value?: string; showDot?: boolean }) {
  const label = value ?? String(children ?? "");
  const tone = tones[label] ?? tones.pending;
  const isLive = liveStatuses.has(label);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] ring-1 ring-inset",
        tone.bg,
        tone.fg,
        tone.ring,
        className,
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            tone.dot,
            isLive && "dot-pulse",
          )}
          style={{ color: "currentColor" }}
        />
      )}
      {children ?? titleCase(label)}
    </span>
  );
}
