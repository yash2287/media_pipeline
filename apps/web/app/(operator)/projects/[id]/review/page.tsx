import { notFound } from "next/navigation";
import { Check, ScanSearch, X } from "lucide-react";
import {
  approveAssetAction,
  bulkApproveAction,
  rejectAssetAction,
  rerunAssetAction,
} from "@/app/(operator)/projects/actions";
import { BulkApproveBar } from "@/components/pipeline/BulkApproveBar";
import { SlotVariantGroup } from "@/components/pipeline/SlotVariantGroup";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { getProjectDetail } from "@/lib/data";
import type { Asset } from "@/lib/types";

function groupBySlot(assets: Asset[]) {
  const map = new Map<
    string,
    {
      baseSlot: string;
      marketplace: string | null;
      intent: string | null;
      assets: Asset[];
    }
  >();
  for (const a of assets) {
    const base = String(a.metadata?.baseSlot ?? a.metadata?.slot ?? "slot");
    const key = `${a.skuId}_${base}`;
    const entry = map.get(key) ?? {
      baseSlot: base,
      marketplace: a.metadata?.marketplace ? String(a.metadata.marketplace) : null,
      intent: a.metadata?.intent ? String(a.metadata.intent) : null,
      assets: [],
    };
    entry.assets.push(a);
    map.set(key, entry);
  }
  return [...map.values()];
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const finals = detail.assets.filter((a) => a.kind === "final");
  const approved = finals.filter((a) => a.qaStatus === "approved").length;
  const rejected = finals.filter((a) => a.qaStatus === "rejected").length;
  const pending = finals.filter((a) => a.qaStatus === "pending" || a.qaStatus === "manual_fix").length;

  const groups = groupBySlot(finals);

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <ScanSearch className="h-3.5 w-3.5" />
            Stage 07 · QA review
          </>
        }
        title={detail.project.clientName}
        description="Approve or reject each generated final. Variants for the same slot are grouped — pick the strongest."
      />

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Approved"
          value={approved}
          hint="Ready for delivery"
          tone="teal"
          icon={<Check className="h-3.5 w-3.5" />}
        />
        <Stat label="Pending" value={pending} hint="Awaiting decision" tone="amber" />
        <Stat
          label="Rejected"
          value={rejected}
          hint="Will be regenerated on re-run"
          tone="rose"
          icon={<X className="h-3.5 w-3.5" />}
        />
      </section>

      {finals.length > 0 ? (
        <div className="mt-4">
          <BulkApproveBar
            projectId={detail.project.id}
            candidates={finals.map((a) => ({ qaScore: a.qaScore, qaStatus: a.qaStatus }))}
            bulkApproveAction={bulkApproveAction}
          />
        </div>
      ) : null}

      <section className="mt-6 space-y-8">
        {finals.length === 0 ? (
          <EmptyState
            icon={<ScanSearch className="h-5 w-5" />}
            title="Nothing to review yet"
            description="Run the pipeline to generate review candidates. Final outputs will appear here with QA scores."
          />
        ) : (
          groups.map((group, i) => (
            <SlotVariantGroup
              key={`${group.baseSlot}-${i}`}
              baseSlot={group.baseSlot}
              marketplace={group.marketplace}
              intent={group.intent}
              assets={group.assets}
              approveAction={approveAssetAction}
              rejectAction={rejectAssetAction}
              rerunAction={rerunAssetAction}
            />
          ))
        )}
      </section>
    </div>
  );
}
