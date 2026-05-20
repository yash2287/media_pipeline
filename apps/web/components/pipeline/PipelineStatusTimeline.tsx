import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Cpu,
  Inbox,
  ImageDown,
  Layers,
  LoaderCircle,
  ScanSearch,
  Sparkles,
  Truck,
  TriangleAlert,
  Wand2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PipelineStep, StepStatus } from "@/lib/types";
import { cn, formatUsd } from "@/lib/utils";

type StageDef = {
  number: number;
  name: string;
  shortName: string;
  description: string;
  defaultApi?: string;
  defaultModel?: string;
  icon: LucideIcon;
};

const STAGES: StageDef[] = [
  {
    number: 1,
    name: "Intake & validation",
    shortName: "Intake",
    description: "Validate raw photos, extract product attributes, mint SKU IDs.",
    defaultApi: "openai",
    defaultModel: "gpt-4o-mini",
    icon: Inbox,
  },
  {
    number: 2,
    name: "Background cutout",
    shortName: "Cutout",
    description: "Bria RMBG produces transparent foreground masks.",
    defaultApi: "fal.ai",
    defaultModel: "bria/background/remove",
    icon: Layers,
  },
  {
    number: 3,
    name: "Style & prompt engine",
    shortName: "Prompts",
    description: "Compose per-slot prompts from brand + industry templates.",
    defaultApi: "internal",
    defaultModel: "prompt-templates",
    icon: Wand2,
  },
  {
    number: 4,
    name: "Scene generation",
    shortName: "Generate",
    description: "gpt-image-2 stages each variant with cutout as reference.",
    defaultApi: "openai",
    defaultModel: "gpt-image-2",
    icon: Sparkles,
  },
  {
    number: 5,
    name: "Enhance & upscale",
    shortName: "Enhance",
    description: "Topaz / Clarity upscale, denoise, shadow compositing.",
    defaultApi: "fal.ai",
    defaultModel: "topaz/upscale",
    icon: Cpu,
  },
  {
    number: 6,
    name: "Multi-format adapt",
    shortName: "Adapt",
    description: "Marketplace, social and catalog crops via sharp.",
    defaultApi: "internal",
    defaultModel: "sharp",
    icon: ImageDown,
  },
  {
    number: 7,
    name: "QA & review gate",
    shortName: "QA",
    description: "Auto-QA score plus operator approval workflow.",
    defaultApi: "openai",
    defaultModel: "gpt-4o-mini",
    icon: ScanSearch,
  },
  {
    number: 8,
    name: "Delivery & handoff",
    shortName: "Deliver",
    description: "Zip approved pack, Drive upload, client checklist.",
    defaultApi: "drive",
    defaultModel: "delivery",
    icon: Truck,
  },
];

type Merged = StageDef & {
  status: StepStatus | "idle";
  apiUsed: string | null;
  modelId: string | null;
  durationMs: number | null;
  costUsd: number;
  error: string | null;
};

function statusBucket(status: StepStatus | "idle") {
  if (status === "succeeded") return "done";
  if (status === "running") return "running";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  if (status === "queued") return "queued";
  return "idle";
}

const statusIconMap: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle2 className="h-4 w-4 text-[var(--teal)]" />,
  running: <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" />,
  queued: <Clock3 className="h-4 w-4 text-[var(--muted)]" />,
  failed: <XCircle className="h-4 w-4 text-[var(--rose)]" />,
  skipped: <CircleDashed className="h-4 w-4 text-[var(--muted-2)]" />,
  idle: <CircleDashed className="h-4 w-4 text-[var(--muted-2)]" />,
};

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${r}s`;
}

export function PipelineStatusTimeline({ steps }: { steps: PipelineStep[] }) {
  const byNumber = new Map<number, PipelineStep>();
  for (const s of steps) byNumber.set(s.stepNumber, s);

  const merged: Merged[] = STAGES.map((stage) => {
    const live = byNumber.get(stage.number);
    return {
      ...stage,
      status: (live?.status ?? "idle") as StepStatus | "idle",
      apiUsed: live?.apiUsed ?? null,
      modelId: live?.modelId ?? null,
      durationMs: live?.durationMs ?? null,
      costUsd: live?.costUsd ?? 0,
      error: live?.error ?? null,
    };
  });

  const completed = merged.filter((m) => m.status === "succeeded").length;
  const runningIndex = merged.findIndex((m) => m.status === "running");
  const failed = merged.some((m) => m.status === "failed");
  const totalCost = merged.reduce((sum, m) => sum + (m.costUsd ?? 0), 0);
  const totalDuration = merged.reduce((sum, m) => sum + (m.durationMs ?? 0), 0);
  const progressPct = (completed / STAGES.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="eyebrow">Stage progress</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="display text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)] mono">
                {completed}
              </span>
              <span className="text-[14px] text-[var(--muted)]">/ {STAGES.length}</span>
            </div>
          </div>
          <div className="divider-v h-9" />
          <div>
            <div className="eyebrow">Elapsed</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--ink)] mono">
              {totalDuration ? formatDuration(totalDuration) : "—"}
            </div>
          </div>
          <div className="divider-v h-9" />
          <div>
            <div className="eyebrow">Spend</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--ink)] mono">
              {formatUsd(totalCost)}
            </div>
          </div>
        </div>
        <div className="min-w-[160px] flex-1 max-w-[260px]">
          <Progress
            value={progressPct}
            tone={failed ? "ink" : "accent"}
            indeterminate={runningIndex >= 0 && !failed && progressPct < 100}
          />
        </div>
      </div>

      {/* Stage rail */}
      <div className="relative">
        <div className="grid grid-cols-8 gap-2">
          {merged.map((stage, idx) => {
            const bucket = statusBucket(stage.status);
            const Icon = stage.icon;
            const isRunning = bucket === "running";
            const isDone = bucket === "done";
            const isFailed = bucket === "failed";

            return (
              <div key={stage.number} className="relative flex flex-col items-center gap-2">
                {/* Connector */}
                {idx > 0 && (
                  <div
                    className="absolute -left-1/2 top-5 -z-0 h-[2px] w-full"
                    aria-hidden
                  >
                    <div
                      className={cn(
                        "h-full w-full rounded-full",
                        idx <= completed
                          ? "bg-[var(--accent)]"
                          : "bg-[var(--line)]",
                      )}
                    />
                    {idx === runningIndex && (
                      <div className="absolute inset-0 overflow-hidden rounded-full">
                        <span className="beam w-1/2" />
                      </div>
                    )}
                  </div>
                )}

                {/* Stage badge */}
                <div
                  className={cn(
                    "relative z-10 grid h-10 w-10 place-items-center rounded-full border transition-all",
                    isDone &&
                      "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal)]",
                    isRunning &&
                      "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_0_5px_var(--accent-glow)]",
                    isFailed &&
                      "border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose)]",
                    bucket === "skipped" &&
                      "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]",
                    (bucket === "idle" || bucket === "queued") &&
                      "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]",
                  )}
                >
                  {isRunning ? (
                    <LoaderCircle className="h-[18px] w-[18px] animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                  ) : isFailed ? (
                    <XCircle className="h-[18px] w-[18px]" />
                  ) : (
                    <Icon className="h-[16px] w-[16px]" />
                  )}
                  {isRunning && (
                    <span className="pointer-events-none absolute inset-0 rounded-full border border-[var(--accent)] opacity-40 animate-ping" />
                  )}
                </div>

                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mono">
                    0{stage.number}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-[11.5px] font-medium leading-tight",
                      isRunning
                        ? "text-[var(--accent-ink)]"
                        : isDone
                        ? "text-[var(--ink)]"
                        : "text-[var(--ink-3)]",
                    )}
                  >
                    {stage.shortName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail list */}
      <div className="space-y-2">
        {merged.map((stage) => {
          const bucket = statusBucket(stage.status);
          const isRunning = bucket === "running";
          const isFailed = bucket === "failed";
          const Icon = stage.icon;

          return (
            <div
              key={stage.number}
              className={cn(
                "group relative flex items-start gap-3 rounded-[12px] border bg-[var(--surface)] px-4 py-3.5 transition-colors",
                isRunning
                  ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/40"
                  : isFailed
                  ? "border-[var(--rose)]/40"
                  : "border-[var(--line)] hover:border-[var(--line-2)]",
              )}
            >
              {isRunning && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[12px]"
                >
                  <span className="beam left-0 w-1/3" />
                </div>
              )}

              <div className="relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)]">
                <Icon className="h-[14px] w-[14px]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mono">
                      0{stage.number}
                    </span>
                    <span className="text-[13.5px] font-semibold text-[var(--ink)]">
                      {stage.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {statusIconMap[bucket]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--ink-3)]">
                    {(stage.apiUsed || stage.defaultApi) && (
                      <span className="chip">
                        {stage.apiUsed ?? stage.defaultApi}
                      </span>
                    )}
                    {(stage.modelId || stage.defaultModel) && (
                      <span className="mono text-[var(--ink-3)]">
                        {stage.modelId ?? stage.defaultModel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-2xl text-[12.5px] leading-5 text-[var(--ink-3)]">
                    {stage.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11.5px] text-[var(--ink-3)] mono">
                    <span>{formatDuration(stage.durationMs)}</span>
                    <span>·</span>
                    <span>{formatUsd(stage.costUsd)}</span>
                  </div>
                </div>

                {stage.error ? (
                  <div className="mt-2 flex items-start gap-2 rounded-[8px] border border-[var(--rose)]/30 bg-[var(--rose-soft)] px-3 py-2 text-[12px] text-[var(--rose)]">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5" />
                    <span className="leading-5">{stage.error}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact strip used inside summary cards: 8 dots indicating stage progression.
export function PipelineStageStrip({ steps }: { steps: PipelineStep[] }) {
  const byNumber = new Map<number, PipelineStep>();
  for (const s of steps) byNumber.set(s.stepNumber, s);

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage) => {
        const live = byNumber.get(stage.number);
        const status = live?.status;
        const tone =
          status === "succeeded"
            ? "bg-[var(--teal)]"
            : status === "running"
            ? "bg-[var(--accent)]"
            : status === "failed"
            ? "bg-[var(--rose)]"
            : status === "queued" || status === "skipped"
            ? "bg-[var(--muted-2)]"
            : "bg-[var(--line)]";

        return (
          <span
            key={stage.number}
            title={`${stage.number}. ${stage.name}`}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              tone,
              status === "running" && "relative overflow-hidden",
            )}
          >
            {status === "running" ? (
              <span className="absolute inset-0 animate-pulse bg-[var(--accent)] opacity-80" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export const PIPELINE_STAGES = STAGES;
