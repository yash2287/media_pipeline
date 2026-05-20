import { Rocket, Sparkles } from "lucide-react";
import { createProjectAction } from "@/app/(operator)/projects/actions";
import { BriefAutofillPanel } from "@/components/intake/BriefAutofillPanel";
import { ProjectWizardForm } from "@/components/intake/ProjectWizardForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getBrandProfiles } from "@/lib/data";
import { hasOpenAiEnv } from "@/lib/env";

const NEW_PROJECT_FORM_ID = "new-project-form";

export default async function NewProjectPage() {
  const brands = await getBrandProfiles();
  const openAiReady = hasOpenAiEnv();

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <Rocket className="h-3.5 w-3.5" />
            New project
          </>
        }
        title="Intake wizard"
        description="Type or speak the concept brief — AI will populate every tab below. Review and edit before creating the project."
      />

      {openAiReady ? (
        <div className="mt-6">
          <BriefAutofillPanel formId={NEW_PROJECT_FORM_ID} />
        </div>
      ) : (
        <div className="mt-6 panel-quiet px-4 py-3 text-[12.5px] text-[var(--ink-3)]">
          Set <span className="mono">OPENAI_API_KEY</span> to enable spoken-brief autofill.
        </div>
      )}

      <form
        id={NEW_PROJECT_FORM_ID}
        action={createProjectAction}
        className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr] items-start"
      >
        <div>
          <ProjectWizardForm brands={brands} />
        </div>

        <aside className="xl:sticky xl:top-6 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <div className="eyebrow eyebrow-accent flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Launch sequence
                </div>
                <CardTitle className="mt-1">8-stage agentic pipeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["01", "Intake & validation"],
                ["02", "Background cutout"],
                ["03", "Prompt engine v2"],
                ["04", "Scene generation"],
                ["05", "Enhance & upscale"],
                ["06", "Adapt & text overlay"],
                ["07", "QA gate"],
                ["08", "Delivery + CSVs"],
              ].map(([n, label]) => (
                <div
                  key={n}
                  className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <span className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {n}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--ink)]">{label}</span>
                </div>
              ))}
              <p className="pt-2 text-[12px] leading-5 text-[var(--ink-3)]">
                After intake, the operator can launch the pipeline from the project page. Run state, costs, and
                stage progress stream live.
              </p>
              <Button type="submit" variant="accent" className="w-full">
                <Rocket className="h-4 w-4" />
                Create project
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
