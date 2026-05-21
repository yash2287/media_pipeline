import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  Cpu,
  ImageIcon,
  Layers,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Truck,
  WandSparkles,
} from "lucide-react";
import {
  deliverProjectAction,
  resetRunStateAction,
  resumePipelineAction,
  runPipelineAction,
} from "@/app/(operator)/projects/actions";
import { AssetGrid } from "@/components/pipeline/AssetGrid";
import { DeliveryPanel } from "@/components/pipeline/DeliveryPanel";
import { PipelineStatusTimeline } from "@/components/pipeline/PipelineStatusTimeline";
import { ProjectAutoRefresh } from "@/components/pipeline/ProjectAutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/ui/page-header";
import { getProjectDetail } from "@/lib/data";
import { cn, formatUsd, titleCase } from "@/lib/utils";

const packLabel: Record<string, string> = {
  marketplace: "Marketplace Launch Pack",
  social: "Social Campaign Pack",
  premium: "Premium AI Photoshoot",
  catalog: "Catalog Refresh",
};

const stageLabel: Record<number, string> = {
  1: "Intake",
  2: "Cutout",
  3: "Prompts",
  4: "Scene generation",
  5: "Enhance",
  6: "Adapt",
  7: "QA",
  8: "Delivery",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);

  if (!detail) notFound();

  const { project, brandProfile, run, steps, assets } = detail;
  // If a run claims it's still running but its started_at is older than this,
  // assume the orchestrator died (common in dev when the CLI disconnects) and
  // surface the recovery banner so the operator can reset/resume.
  const STALE_RUN_MS = 15 * 60 * 1000;
  const runStartedMs = run?.startedAt ? new Date(run.startedAt).getTime() : null;
  const isRunStale =
    (run?.status === "running" || run?.status === "queued") &&
    runStartedMs !== null &&
    Date.now() - runStartedMs > STALE_RUN_MS;
  const shouldAutoRefresh =
    !isRunStale &&
    (project.status === "running" || run?.status === "queued" || run?.status === "running");
  const approvedAssets = assets.filter(
    (asset) =>
      asset.kind === "final" && asset.qaStatus === "approved" && asset.metadata.runId === run?.id,
  );
  const finals = assets.filter((a) => a.kind === "final");
  const rawCount = assets.filter((a) => a.kind === "raw").length;
  const completedSteps = steps.filter((s) => s.status === "succeeded").length;
  const due = formatDate(project.dueAt);
  const isStuck =
    isRunStale ||
    (project.status === "running" &&
      run?.status !== "running" &&
      run?.status !== "queued");
  const isFailed = project.status === "failed" || run?.status === "failed";
  const canRun = rawCount > 0 && !shouldAutoRefresh;
  // Pick the step to resume from: prefer the first step row that didn't reach
  // "succeeded" (covers explicit failures + orphans stuck on "running"). If all
  // existing rows are succeeded but the pipeline never finished (e.g. parent
  // died after step 6 wrote success but before step 7 ever started), fall back
  // to the step after the highest succeeded one. The orchestrator stops at 7.
  const PIPELINE_MAX_STEP = 7;
  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const firstIncomplete = sortedSteps.find((step) => step.status !== "succeeded");
  const maxSucceededStep = sortedSteps
    .filter((step) => step.status === "succeeded")
    .reduce((max, step) => Math.max(max, step.stepNumber), 0);
  const resumeStepNumber =
    firstIncomplete?.stepNumber ??
    (maxSucceededStep > 0 && maxSucceededStep < PIPELINE_MAX_STEP
      ? maxSucceededStep + 1
      : null);
  const isResumableRunStatus = run?.status === "failed" || run?.status === "canceled";
  const canResume = Boolean(
    isResumableRunStatus && resumeStepNumber !== null && rawCount > 0 && !shouldAutoRefresh,
  );
  const resumeStepLabel =
    resumeStepNumber !== null
      ? `${resumeStepNumber}. ${stageLabel[resumeStepNumber] ?? firstIncomplete?.stepName ?? ""}`.trim()
      : null;

  return (
    <div className="page">
      <ProjectAutoRefresh active={shouldAutoRefresh} />

      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        All projects
      </Link>

      <div className="mt-3">
        <PageHeader
          eyebrow={
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Project detail
            </>
          }
          title={project.clientName}
          description={
            project.clientEmail ? (
              <>
                Client contact <span className="mono text-[var(--ink-2)]">{project.clientEmail}</span>
              </>
            ) : (
              "No client email captured yet."
            )
          }
          meta={
            <>
              <Badge value={project.status} />
              <span className="chip">
                <Boxes className="h-3 w-3" />
                {packLabel[project.packType] ?? titleCase(project.packType)}
              </span>
              {brandProfile ? (
                <span className="chip">
                  <Layers className="h-3 w-3 text-[var(--accent)]" />
                  {brandProfile.name}
                </span>
              ) : null}
              {due ? (
                <span className="chip">
                  <CalendarDays className="h-3 w-3" />
                  Due {due}
                </span>
              ) : null}
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <form action={runPipelineAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" variant="accent" disabled={!canRun} title={canRun ? undefined : rawCount === 0 ? "Upload source photos first" : "A run is already in progress"}>
                  <Play className="h-4 w-4" />
                  Run pipeline
                </Button>
              </form>
              <Link href={`/projects/${project.id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/review`}>
                <Button variant="outline">
                  <WandSparkles className="h-4 w-4" />
                  Review
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* Recovery banner — surfaces issues that block running */}
      {(isFailed || isStuck || rawCount === 0) && (
        <div className="mt-5 panel-raise relative flex flex-wrap items-start justify-between gap-4 border-[var(--rose)]/40 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--rose-soft)] text-[var(--rose)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[var(--ink)]">
                {rawCount === 0
                  ? "No source photos uploaded"
                  : isStuck
                    ? "Run looks stuck"
                    : "Last run failed"}
              </div>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[var(--ink-3)]">
                {rawCount === 0
                  ? "The pipeline needs at least one raw product photo. Open the editor or intake tab to upload."
                  : isStuck
                    ? "Project is in running state but no run is active. Reset to recover."
                    : run?.error
                      ? run.error
                      : canResume
                        ? "Resume from the failed stage to keep completed assets and avoid starting from scratch."
                        : "Edit the project to fix the inputs, then re-run. Saving will reset status to intake."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/projects/${project.id}/edit`}>
              <Button variant="accent" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit project
              </Button>
            </Link>
            {(isStuck || isFailed) && (
              <>
                {canResume ? (
                  <form action={resumePipelineAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <Button type="submit" variant="accent" size="sm">
                      <Play className="h-3.5 w-3.5" />
                      Resume from {resumeStepLabel}
                    </Button>
                  </form>
                ) : null}
              </>
            )}
            {(isStuck || isFailed) && (
              <form action={resetRunStateAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" variant="secondary" size="sm">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset run
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Stage"
          value={`${completedSteps}/8`}
          hint={run?.status ? titleCase(run.status) : "Idle run"}
          tone="accent"
          icon={<Cpu className="h-3.5 w-3.5" />}
        />
        <Stat
          label="API spend"
          value={formatUsd(project.totalCostUsd)}
          hint="Across this project"
          tone="emerald"
        />
        <Stat
          label="Assets"
          value={assets.length}
          hint={`${finals.length} finals · ${approvedAssets.length} approved`}
          tone="teal"
          icon={<ImageIcon className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Delivery"
          value={project.deliveryUrl ? "Ready" : "Pending"}
          hint={project.deliveryUrl ? "Drive link generated" : "Pack not yet bundled"}
          tone={project.deliveryUrl ? "emerald" : "amber"}
          icon={<Truck className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Run status"
          value={titleCase(run?.status ?? "idle")}
          hint={run?.error ? "Last run failed" : "Trigger.dev orchestrated"}
          tone={run?.status === "failed" ? "rose" : "default"}
        />
      </section>

      {/* Pipeline + Brand */}
      <section className="mt-6 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <div className="eyebrow eyebrow-accent">Agentic workflow</div>
              <CardTitle className="mt-1">Pipeline stages</CardTitle>
            </div>
            <span className="chip">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  shouldAutoRefresh ? "bg-[var(--accent)] dot-pulse" : "bg-[var(--muted-2)]",
                )}
              />
              {shouldAutoRefresh ? "Live · auto-refresh" : "Idle"}
            </span>
          </CardHeader>
          <CardContent>
            <PipelineStatusTimeline steps={steps} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div>
                <div className="eyebrow">Brand</div>
                <CardTitle className="mt-1">{brandProfile?.name ?? "No brand attached"}</CardTitle>
              </div>
              {brandProfile ? (
                <span className="chip mono">{titleCase(brandProfile.industry)}</span>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {brandProfile?.colorPalette?.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  {brandProfile.colorPalette.map((c) => (
                    <div
                      key={`${brandProfile.id}-${c.hex}`}
                      className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] text-[var(--ink-2)]"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-[var(--line)]"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="mono">{c.hex}</span>
                      <span className="text-[var(--muted)]">· {c.role}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {brandProfile?.styleKeywords?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {brandProfile.styleKeywords.map((k) => (
                    <span key={k} className="chip">{k}</span>
                  ))}
                </div>
              ) : null}
              <p className="text-[13px] leading-6 text-[var(--ink-3)]">
                {brandProfile?.brandGuidelinesMd ?? "Brand guidance will appear here once a profile is attached."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <div className="eyebrow">Shortcuts</div>
                <CardTitle className="mt-1">Workflow</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: `/projects/${project.id}/intake`, label: "Revisit intake", icon: Boxes },
                { href: `/projects/${project.id}/review`, label: "QA review gate", icon: WandSparkles },
                { href: `/projects/${project.id}/delivery`, label: "Delivery handoff", icon: Truck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    <span className="flex items-center gap-2 font-medium text-[var(--ink-2)] group-hover:text-[var(--accent-ink)]">
                      <Icon className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)]" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Approved assets */}
      <section className="mt-6">
        <Card>
          <CardHeader>
            <div>
              <div className="eyebrow">Output gallery</div>
              <CardTitle className="mt-1">Approved creatives</CardTitle>
            </div>
            <span className="chip mono">{approvedAssets.length} / {finals.length}</span>
          </CardHeader>
          <CardContent>
            <AssetGrid
              assets={approvedAssets}
              showFilter={false}
              emptyTitle="No approved creatives yet"
              emptyDescription="Approve outputs from the QA review gate to populate the delivery gallery."
            />
          </CardContent>
        </Card>
      </section>

      {/* Delivery */}
      <section className="mt-6">
        <DeliveryPanel project={project} deliverAction={deliverProjectAction} />
      </section>
    </div>
  );
}
