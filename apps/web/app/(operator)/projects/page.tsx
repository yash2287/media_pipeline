import Link from "next/link";
import { Activity, FolderKanban, Layers, Plus, Sparkles, TrendingUp, Zap } from "lucide-react";
import { PipelineSummaryCard } from "@/components/pipeline/PipelineSummaryCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { getBrandProfiles, getProjectDetail, getProjects } from "@/lib/data";
import { formatUsd } from "@/lib/utils";

export default async function ProjectsPage() {
  const [projects, brands] = await Promise.all([getProjects(), getBrandProfiles()]);

  const details = await Promise.all(projects.map((p) => getProjectDetail(p.id)));

  const totalSpend = projects.reduce((sum, p) => sum + p.totalCostUsd, 0);
  const inReview = projects.filter((p) => p.status === "review").length;
  const active = projects.filter((p) => p.status === "running" || p.status === "intake" || p.status === "review").length;
  const delivered = projects.filter((p) => p.status === "delivered").length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Operator console
          </>
        }
        title="Creative pipeline"
        description="Single-tenant orchestration for the AI product image pipeline. Intake raw photos, run multi-stage automation, review outputs, and deliver client packs in hours."
        actions={
          <Link href="/projects/new">
            <Button variant="default">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      {/* KPI Strip */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active"
          value={active}
          hint={`${projects.length} total · ${delivered} delivered`}
          tone="accent"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <Stat
          label="In review"
          value={inReview}
          hint="Awaiting operator QA"
          tone="amber"
          icon={<Layers className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Brand profiles"
          value={brands.length}
          hint="Reusable style + palette"
          tone="teal"
          icon={<FolderKanban className="h-3.5 w-3.5" />}
        />
        <Stat
          label="API spend"
          value={formatUsd(totalSpend)}
          hint="Across all projects"
          tone="emerald"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </section>

      {/* Project Grid */}
      <section className="mt-8 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">Project queue</h2>
            <p className="mt-1 text-[12.5px] text-[var(--ink-3)]">
              Each card runs the same 8-stage pipeline — intake to delivery.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 chip">
            <Zap className="h-3 w-3 text-[var(--accent)]" />
            Marketplace Launch Pack · £600
          </div>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="No projects yet"
            description="Create your first project to kick off the automated pipeline. Intake raw assets, set a brand profile, and the pipeline handles the rest."
            action={
              <Link href="/projects/new">
                <Button variant="default">
                  <Plus className="h-4 w-4" />
                  Start a project
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, idx) => {
              const detail = details[idx];
              return (
                <PipelineSummaryCard
                  key={project.id}
                  project={project}
                  steps={detail?.steps ?? []}
                  assetCount={detail?.assets.length ?? 0}
                  brandName={detail?.brandProfile?.name ?? null}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
