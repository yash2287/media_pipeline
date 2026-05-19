import { createProjectAction } from "@/app/(operator)/projects/actions";
import { BrandProfileForm } from "@/components/intake/BrandProfileForm";
import { BulkUploader } from "@/components/intake/BulkUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrandProfiles } from "@/lib/data";

export default async function NewProjectPage() {
  const brands = await getBrandProfiles();

  return (
    <div className="px-6 py-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">New project</div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Intake wizard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Capture the client brief, attach raw product photos, and create a project record ready for the Trigger pipeline.
        </p>
      </div>

      <form action={createProjectAction} className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client and pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="clientName">Client name</Label>
                <Input id="clientName" name="clientName" required placeholder="Maya Patel" />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client email</Label>
                <Input id="clientEmail" name="clientEmail" type="email" placeholder="maya@example.com" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="packType">Pack type</Label>
                <select id="packType" name="packType" className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm">
                  <option value="marketplace">Marketplace Launch Pack</option>
                  <option value="social">Social Campaign Pack</option>
                  <option value="premium">Premium AI Photoshoot</option>
                  <option value="catalog">Catalog Refresh Pack</option>
                </select>
              </div>
              <div>
                <Label htmlFor="dueAt">Due date</Label>
                <Input id="dueAt" name="dueAt" type="datetime-local" />
              </div>
            </div>

            <BrandProfileForm brands={brands} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw asset upload</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkUploader />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Launch sequence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted)]">
              <p>After intake, the operator can run validation, cutouts, prompt generation, scene staging, multi-format adaptation, QA, and delivery from the project view.</p>
              <Button type="submit" className="w-full">
                Create project
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

