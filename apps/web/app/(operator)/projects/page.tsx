import Link from "next/link";
import { ArrowUpRight, Plus, Zap } from "lucide-react";
import { getBrandProfiles, getProjects } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils";

export default async function ProjectsPage() {
  const [projects, brands] = await Promise.all([getProjects(), getBrandProfiles()]);

  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Operator Dashboard</div>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Project queue</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Single-tenant workflow for Yashashree to intake raw product photos, run background automation, review output quality, and deliver fixed-scope client packs.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_0.9fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline throughput</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md bg-[var(--teal-soft)] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--teal)]">Active projects</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{projects.length}</div>
            </div>
            <div className="rounded-md bg-[var(--purple-soft)] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--purple)]">Brand profiles</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{brands.length}</div>
            </div>
            <div className="rounded-md bg-[var(--amber-soft)] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--amber)]">API spend</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {formatUsd(projects.reduce((sum, item) => sum + item.totalCostUsd, 0))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offer fit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <Zap className="h-4 w-4 text-[var(--purple)]" />
              20 SKUs in 72 hours
            </div>
            <p>Marketplace pack remains the lead offer. Everything in the UI is optimized around intake speed, QA discipline, and delivery margin visibility.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        {projects.length === 0 ? (
          <div className="panel px-5 py-10 text-sm text-[var(--muted)]">
            No projects found. Create your first project to start real pipeline testing.
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.6fr] gap-3 border-b border-[var(--line)] bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              <div>Client</div>
              <div>Pack</div>
              <div>Status</div>
              <div>Cost</div>
              <div></div>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {projects.map((project) => (
                <div key={project.id} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.6fr] items-center gap-3 px-5 py-4 text-sm">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">{project.clientName}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{project.clientEmail ?? "No client email yet"}</div>
                  </div>
                  <div className="text-[var(--foreground)]">{project.packType}</div>
                  <div>
                    <Badge value={project.status} />
                  </div>
                  <div className="text-[var(--foreground)]">{formatUsd(project.totalCostUsd)}</div>
                  <div className="text-right">
                    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-[var(--purple)]">
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
