import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteProjectMenu } from "@/components/pipeline/DeleteProjectMenu";
import { PipelineStageStrip } from "@/components/pipeline/PipelineStatusTimeline";
import type { PipelineStep, Project } from "@/lib/types";
import { cn, formatUsd, titleCase } from "@/lib/utils";

const packLabel: Record<string, string> = {
  marketplace: "Marketplace Launch",
  social: "Social Campaign",
  premium: "Premium Photoshoot",
  catalog: "Catalog Refresh",
};

function brandAccent(name: string) {
  const palette = [
    "from-[#4338ca] to-[#7c3aed]",
    "from-[#0f766e] to-[#14b8a6]",
    "from-[#b45309] to-[#f59e0b]",
    "from-[#9d174d] to-[#ec4899]",
    "from-[#1f2937] to-[#475569]",
  ];
  const i = name.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % palette.length;
  return palette[i];
}

function formatDue(dueAt: string | null) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PipelineSummaryCard({
  project,
  steps,
  assetCount,
  brandName,
}: {
  project: Project;
  steps: PipelineStep[];
  assetCount?: number;
  brandName?: string | null;
}) {
  const initials = project.clientName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const due = formatDue(project.dueAt);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="panel card-hover group relative flex h-full flex-col gap-4 overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br text-[12px] font-semibold text-white shadow-[var(--shadow-sm)]",
              brandAccent(project.clientName),
            )}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold text-[var(--ink)]">
              {project.clientName}
            </div>
            <div className="text-[12px] text-[var(--ink-3)]">
              {packLabel[project.packType] ?? titleCase(project.packType)}
              {brandName ? <span className="text-[var(--muted)]"> · {brandName}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge value={project.status} />
          <DeleteProjectMenu projectId={project.id} clientName={project.clientName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <PipelineStageStrip steps={steps} />
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>Pipeline</span>
          <span className="mono">
            {steps.filter((s) => s.status === "succeeded").length}/8
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <div className="flex items-center gap-4 text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Spend</div>
            <div className="mono text-[13px] font-semibold text-[var(--ink)]">
              {formatUsd(project.totalCostUsd)}
            </div>
          </div>
          <div className="divider-v h-7" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Assets</div>
            <div className="mono text-[13px] font-semibold text-[var(--ink)]">
              {assetCount ?? "—"}
            </div>
          </div>
          {due ? (
            <>
              <div className="divider-v h-7" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Due</div>
                <div className="mono inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ink)]">
                  <CalendarClock className="h-3 w-3 text-[var(--muted)]" />
                  {due}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-2)] transition-colors group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent-ink)]">
          Open
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
