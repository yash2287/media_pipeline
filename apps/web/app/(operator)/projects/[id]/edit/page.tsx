import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil, Save, Sparkles, Trash2 } from "lucide-react";
import {
  deleteProjectAction,
  updateProjectAction,
} from "@/app/(operator)/projects/actions";
import { BriefAutofillPanel } from "@/components/intake/BriefAutofillPanel";
import { ProjectWizardForm } from "@/components/intake/ProjectWizardForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getBrandProfiles, getProjectDetail } from "@/lib/data";
import { hasOpenAiEnv } from "@/lib/env";

const EDIT_FORM_ID = "edit-project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, brands] = await Promise.all([
    getProjectDetail(id),
    getBrandProfiles(),
  ]);
  if (!detail) notFound();

  const openAiReady = hasOpenAiEnv();
  const rawCount = detail.assets.filter((a) => a.kind === "raw").length;
  const refCount = detail.assets.filter((a) => a.kind === "reference").length;

  return (
    <div className="page">
      <Link
        href={`/projects/${detail.project.id}`}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        Back to project
      </Link>

      <div className="mt-3">
        <PageHeader
          eyebrow={
            <>
              <Pencil className="h-3.5 w-3.5" />
              Edit project
            </>
          }
          title={detail.project.clientName}
          description="Update any field, attach more raw or reference photos, then save. Failed projects are reset back to intake so you can re-run."
        />
      </div>

      {openAiReady ? (
        <div className="mt-6">
          <BriefAutofillPanel formId={EDIT_FORM_ID} />
        </div>
      ) : null}

      <form
        id={EDIT_FORM_ID}
        action={updateProjectAction}
        className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr] items-start"
      >
        <input type="hidden" name="projectId" value={detail.project.id} />

        <div>
          <ProjectWizardForm
            brands={brands}
            defaults={{
              project: detail.project,
              brand: detail.brandProfile,
              rawAssetCount: rawCount,
              referenceAssetCount: refCount,
            }}
          />
        </div>

        <aside className="xl:sticky xl:top-6 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <div className="eyebrow eyebrow-accent flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Save changes
                </div>
                <CardTitle className="mt-1">Review and persist</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-[12.5px] text-[var(--ink-3)]">
                <div className="flex items-center justify-between">
                  <span>Raw photos</span>
                  <span className="mono text-[var(--ink)]">{rawCount}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Reference images</span>
                  <span className="mono text-[var(--ink)]">{refCount}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Status</span>
                  <span className="mono text-[var(--ink)]">{detail.project.status}</span>
                </div>
              </div>
              <p className="text-[12px] leading-5 text-[var(--ink-3)]">
                Existing photos stay attached. New uploads on the Assets tab are appended. If this project
                is currently failed, saving will reset it back to <span className="mono">intake</span> so
                you can run the pipeline again.
              </p>
              <Button type="submit" variant="accent" className="w-full">
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <div className="eyebrow flex items-center gap-1.5 text-[var(--rose)]">
                  <Trash2 className="h-3 w-3" />
                  Danger zone
                </div>
                <CardTitle className="mt-1">Delete this project</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <DeleteProjectControl projectId={detail.project.id} clientName={detail.project.clientName} />
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function DeleteProjectControl({
  projectId,
  clientName,
}: {
  projectId: string;
  clientName: string;
}) {
  return (
    <form action={deleteProjectAction} className="space-y-2.5">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-[12.5px] leading-5 text-[var(--ink-3)]">
        Permanently removes the project record, all pipeline runs and steps, and every stored asset
        (raw, cutout, generated, upscaled, final, companion, deliveries). This cannot be undone.
      </p>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        Type <span className="mono text-[var(--rose)]">DELETE</span> to confirm
      </label>
      <input
        type="text"
        name="confirm"
        required
        autoComplete="off"
        placeholder="DELETE"
        className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:border-[var(--rose)] focus:outline-none focus:ring-4 focus:ring-[rgba(185,28,75,0.18)]"
      />
      <Button type="submit" variant="danger" className="w-full">
        <Trash2 className="h-4 w-4" />
        Delete {clientName}
      </Button>
    </form>
  );
}
