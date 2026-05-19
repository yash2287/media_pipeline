import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPromptTemplates } from "@/lib/data";

export default async function TemplatesPage() {
  const templates = await getPromptTemplates();

  return (
    <div className="px-6 py-6">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Templates</div>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Prompt library</h1>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>
                {template.industry} · {template.slot}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md bg-stone-50 px-4 py-3 text-[var(--foreground)]">{template.promptTemplate}</div>
              <div className="text-xs text-[var(--muted)]">{template.modelId}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

