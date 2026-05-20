import { LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPromptTemplates } from "@/lib/data";
import { titleCase } from "@/lib/utils";

export default async function TemplatesPage() {
  const templates = await getPromptTemplates();

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <LayoutTemplate className="h-3.5 w-3.5" />
            Prompt library
          </>
        }
        title="Templates"
        description="Slot-filled prompt templates per industry + scene. The prompt engine composes these with brand color, style, and SKU attributes."
      />

      {templates.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<LayoutTemplate className="h-5 w-5" />}
            title="No templates configured"
            description="Add prompt templates to the prompt_templates table to populate this library."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} hoverable>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="chip">{titleCase(t.industry)}</span>
                  <CardTitle className="mono text-[12.5px] text-[var(--ink-2)]">{t.slot}</CardTitle>
                </div>
                <span className="chip mono">{t.modelId}</span>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                  <div className="eyebrow mb-2">Prompt</div>
                  <pre className="mono whitespace-pre-wrap break-words text-[12.5px] leading-6 text-[var(--ink-2)]">
                    {t.promptTemplate}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
