import { CheckCircle2, CircleDashed, Clock3, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import type { PipelineStep } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

const statusIcon: Record<string, React.ReactNode> = {
  queued: <Clock3 className="h-4 w-4 text-stone-500" />,
  running: <LoaderCircle className="h-4 w-4 animate-spin text-[var(--purple)]" />,
  succeeded: <CheckCircle2 className="h-4 w-4 text-[var(--teal)]" />,
  failed: <XCircle className="h-4 w-4 text-[var(--danger)]" />,
  skipped: <CircleDashed className="h-4 w-4 text-stone-400" />,
};

export function PipelineStatusTimeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.id} className="flex gap-3 rounded-md border border-[var(--line)] bg-white px-4 py-3">
          <div className="mt-0.5">{statusIcon[step.status] ?? <TriangleAlert className="h-4 w-4 text-[var(--amber)]" />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-[var(--foreground)]">
                {step.stepNumber}. {step.stepName}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {step.apiUsed ? `${step.apiUsed} • ` : ""}
                {step.modelId ? `${step.modelId} • ` : ""}
                {formatUsd(step.costUsd)}
              </div>
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {step.durationMs ? `${Math.round(step.durationMs / 1000)}s` : "In progress"}
              {step.error ? ` • ${step.error}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

