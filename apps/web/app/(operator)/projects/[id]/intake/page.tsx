import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ChevronRight, Save, Upload, Wand2 } from "lucide-react";
import { uploadAssetsAction } from "@/app/(operator)/projects/actions";
import { BrandProfileForm } from "@/components/intake/BrandProfileForm";
import { BulkUploader } from "@/components/intake/BulkUploader";
import { ReferenceUploader } from "@/components/intake/ReferenceUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getBrandProfiles, getProjectDetail } from "@/lib/data";

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, brands] = await Promise.all([getProjectDetail(id), getBrandProfiles()]);
  if (!detail) notFound();

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
              <Boxes className="h-3.5 w-3.5" />
              Stage 01 · Intake
            </>
          }
          title={detail.project.clientName}
          description="Attach a brand profile and upload source raw photos. New uploads are appended — existing assets stay attached. Failed projects are reset back to intake automatically."
          actions={
            <Link href={`/projects/${detail.project.id}/edit`}>
              <Button variant="secondary">
                <Wand2 className="h-4 w-4" />
                Full editor
              </Button>
            </Link>
          }
        />
      </div>

      <form
        action={uploadAssetsAction}
        encType="multipart/form-data"
        className="mt-8 space-y-5"
      >
        <input type="hidden" name="projectId" value={detail.project.id} />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Wand2 className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Brand profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BrandProfileForm brands={brands} defaults={detail.brandProfile} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Upload className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Raw source photos</CardTitle>
              </div>
              <span className="chip mono">{rawCount} attached</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {rawCount > 0 ? (
                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[12.5px] text-[var(--ink-3)]">
                  Existing photos remain attached. New uploads are appended.
                </div>
              ) : null}
              <BulkUploader />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wand2 className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Reference images</CardTitle>
            </div>
            <span className="chip mono">{refCount} attached</span>
          </CardHeader>
          <CardContent>
            <ReferenceUploader />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/projects/${detail.project.id}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button type="submit" variant="accent">
            <Save className="h-4 w-4" />
            Save intake
          </Button>
        </div>
      </form>
    </div>
  );
}
