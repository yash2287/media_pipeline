import { notFound } from "next/navigation";
import { deliverProjectAction } from "@/app/(operator)/projects/actions";
import { DeliveryPanel } from "@/components/pipeline/DeliveryPanel";
import { getProjectDetail } from "@/lib/data";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  return (
    <div className="px-6 py-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Delivery</div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{detail.project.clientName}</h1>
      </div>

      <div className="mt-6 max-w-4xl">
        <DeliveryPanel project={detail.project} deliverAction={deliverProjectAction} />
      </div>
    </div>
  );
}

