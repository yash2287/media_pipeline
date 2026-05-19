import { notFound } from "next/navigation";
import { BrandProfileForm } from "@/components/intake/BrandProfileForm";
import { BulkUploader } from "@/components/intake/BulkUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandProfiles, getProjectDetail } from "@/lib/data";

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, brands] = await Promise.all([getProjectDetail(id), getBrandProfiles()]);
  if (!detail) notFound();

  return (
    <div className="px-6 py-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Intake</div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{detail.project.clientName}</h1>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Brand profile</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandProfileForm brands={brands} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Raw source assets</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkUploader />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

