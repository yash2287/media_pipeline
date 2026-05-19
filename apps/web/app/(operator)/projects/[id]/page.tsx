import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ChevronRight, Play, WandSparkles } from "lucide-react";
import { deliverProjectAction, runPipelineAction } from "@/app/(operator)/projects/actions";
import { AssetGrid } from "@/components/pipeline/AssetGrid";
import { DeliveryPanel } from "@/components/pipeline/DeliveryPanel";
import { PipelineStatusTimeline } from "@/components/pipeline/PipelineStatusTimeline";
import { ProjectAutoRefresh } from "@/components/pipeline/ProjectAutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectDetail } from "@/lib/data";
import { formatUsd } from "@/lib/utils";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);

  if (!detail) notFound();

  const { project, brandProfile, run, steps, assets } = detail;
  const shouldAutoRefresh = project.status === "running" || run?.status === "queued" || run?.status === "running";
  const approvedAssets = assets.filter(
    (asset) => asset.kind === "final" && asset.qaStatus === "approved" && asset.metadata.runId === run?.id,
  );

  return (
    <div className="px-6 py-6">
      <ProjectAutoRefresh active={shouldAutoRefresh} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Project detail</div>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{project.clientName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <Badge value={project.status} />
            <span>{project.packType}</span>
            <span>{brandProfile?.name ?? "No brand profile"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={runPipelineAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit">
              <Play className="h-4 w-4" />
              Run pipeline
            </Button>
          </form>
          <Link href={`/projects/${project.id}/review`}>
            <Button variant="outline">
              <WandSparkles className="h-4 w-4" />
              Review outputs
            </Button>
          </Link>
        </div>
      </div>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Commercial snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--teal-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--teal)]">API spend</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{formatUsd(project.totalCostUsd)}</div>
            </div>
            <div className="rounded-md bg-[var(--purple-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--purple)]">Assets</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{assets.length}</div>
            </div>
            <div className="rounded-md bg-[var(--amber-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--amber)]">Run state</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{run?.status ?? "idle"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand direction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(brandProfile?.styleKeywords ?? ["no", "brand", "keywords"]).map((keyword) => (
                <span key={keyword} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-[var(--foreground)]">
                  {keyword}
                </span>
              ))}
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">{brandProfile?.brandGuidelinesMd ?? "Brand guidance will appear here."}</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline status</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineStatusTimeline steps={steps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approved assets</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetGrid assets={approvedAssets} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <DeliveryPanel project={project} deliverAction={deliverProjectAction} />

        <Card>
          <CardHeader>
            <CardTitle>Workflow shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link href={`/projects/${project.id}/intake`} className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3">
              <span className="flex items-center gap-2 text-[var(--foreground)]">
                <Boxes className="h-4 w-4 text-[var(--teal)]" />
                Revisit intake
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </Link>
            <Link href={`/projects/${project.id}/review`} className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3">
              <span className="flex items-center gap-2 text-[var(--foreground)]">
                <WandSparkles className="h-4 w-4 text-[var(--purple)]" />
                QA review gate
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </Link>
            <Link href={`/projects/${project.id}/delivery`} className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3">
              <span className="flex items-center gap-2 text-[var(--foreground)]">
                <Play className="h-4 w-4 text-[var(--amber)]" />
                Delivery handoff
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
