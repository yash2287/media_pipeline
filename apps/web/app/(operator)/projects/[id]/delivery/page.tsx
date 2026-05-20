import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { deliverProjectAction } from "@/app/(operator)/projects/actions";
import { DeliveryPanel } from "@/components/pipeline/DeliveryPanel";
import { PageHeader } from "@/components/ui/page-header";
import { getProjectDetail } from "@/lib/data";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <Truck className="h-3.5 w-3.5" />
            Stage 08 · Delivery
          </>
        }
        title={detail.project.clientName}
        description="Bundle approved assets, mirror to Google Drive, and hand off the client checklist."
      />
      <div className="mt-8 max-w-4xl">
        <DeliveryPanel project={detail.project} deliverAction={deliverProjectAction} />
      </div>
    </div>
  );
}
