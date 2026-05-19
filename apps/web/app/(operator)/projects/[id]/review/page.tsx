import { notFound } from "next/navigation";
import { approveAssetAction, rejectAssetAction, rerunAssetAction } from "@/app/(operator)/projects/actions";
import { QAReviewCard } from "@/components/pipeline/QAReviewCard";
import { getProjectDetail } from "@/lib/data";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  return (
    <div className="px-6 py-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">QA review</div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{detail.project.clientName}</h1>
      </div>

      <div className="mt-6 space-y-4">
        {detail.assets.filter((asset) => asset.kind === "final").map((asset) => (
          <QAReviewCard
            key={asset.id}
            asset={asset}
            approveAction={approveAssetAction}
            rejectAction={rejectAssetAction}
            rerunAction={rerunAssetAction}
          />
        ))}
      </div>
    </div>
  );
}

