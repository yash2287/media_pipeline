import { CheckCircle2, ExternalLink, FileArchive, FolderOpenDot, Send, Sparkles } from "lucide-react";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Tile({
  icon: Icon,
  label,
  description,
  ready,
}: {
  icon: typeof FileArchive;
  label: string;
  description: string;
  ready: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[12px] border bg-[var(--surface)] px-4 py-3.5 transition-colors",
        ready ? "border-[var(--teal)]/40" : "border-[var(--line)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)]">
          <Icon className="h-[14px] w-[14px]" />
        </div>
        {ready ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Pending
          </span>
        )}
      </div>
      <div className="mt-3 text-[13.5px] font-semibold text-[var(--ink)]">{label}</div>
      <div className="mt-0.5 text-[11.5px] leading-5 text-[var(--ink-3)]">{description}</div>
    </div>
  );
}

export function DeliveryPanel({
  project,
  deliverAction,
}: {
  project: Project;
  deliverAction: (formData: FormData) => Promise<void>;
}) {
  const hasDelivery = Boolean(project.deliveryUrl);

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="eyebrow">Stage 08</div>
          <CardTitle className="mt-1">Delivery handoff</CardTitle>
        </div>
        <span className="chip">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          {hasDelivery ? "Delivered" : "Awaiting package"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile
            icon={FileArchive}
            label="Approved zip"
            description="All approved pack assets bundled at native resolution."
            ready={hasDelivery}
          />
          <Tile
            icon={FolderOpenDot}
            label="Google Drive"
            description="Mirrored Drive folder with shareable client link."
            ready={hasDelivery}
          />
          <Tile
            icon={Send}
            label="Client checklist"
            description="One-page PDF with file map + usage notes."
            ready={hasDelivery}
          />
        </div>

        {project.deliveryUrl ? (
          <a
            href={project.deliveryUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <span className="mono truncate text-[12px] text-[var(--ink-2)] group-hover:text-[var(--accent-ink)]">
              {project.deliveryUrl}
            </span>
            <ExternalLink className="h-4 w-4 text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]" />
          </a>
        ) : (
          <p className="text-[13px] text-[var(--ink-3)]">
            No delivery link generated yet. Package approved assets to publish a Drive link.
          </p>
        )}

        <form action={deliverAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Button type="submit" variant="accent" className="w-full sm:w-auto">
            <Send className="h-4 w-4" />
            {hasDelivery ? "Regenerate delivery package" : "Create delivery package"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
