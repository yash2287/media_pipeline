import { ExternalLink, FileArchive, FolderOpenDot, Send } from "lucide-react";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DeliveryPanel({
  project,
  deliverAction,
}: {
  project: Project;
  deliverAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <FileArchive className="h-4 w-4" />
              Zip
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">Approved pack archive</div>
          </div>
          <div className="rounded-md bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <FolderOpenDot className="h-4 w-4" />
              Drive
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">Google Drive handoff</div>
          </div>
          <div className="rounded-md bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <Send className="h-4 w-4" />
              Email
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">Client checklist PDF</div>
          </div>
        </div>

        {project.deliveryUrl ? (
          <a href={project.deliveryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[var(--purple)]">
            Open current delivery link
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="text-sm text-[var(--muted)]">No delivery link created yet.</p>
        )}

        <form action={deliverAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Button type="submit">Create delivery package</Button>
        </form>
      </CardContent>
    </Card>
  );
}

