import { QAReviewCard } from "@/components/pipeline/QAReviewCard";
import type { Asset } from "@/lib/types";
import { titleCase } from "@/lib/utils";

export function SlotVariantGroup({
  baseSlot,
  marketplace,
  intent,
  assets,
  approveAction,
  rejectAction,
  rerunAction,
}: {
  baseSlot: string;
  marketplace: string | null;
  intent: string | null;
  assets: Asset[];
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  rerunAction: (formData: FormData) => Promise<void>;
}) {
  const headerLabel = baseSlot ? titleCase(baseSlot.replace(/_/g, " ")) : "Slot";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <div className="eyebrow">
            {intent ? titleCase(intent.replace(/_/g, " ")) : "Slot"}
          </div>
          <h3 className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{headerLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          {marketplace && marketplace !== "any" ? (
            <span className="chip mono">{marketplace}</span>
          ) : null}
          <span className="chip mono">{assets.length} variant{assets.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="space-y-3">
        {assets.map((asset) => (
          <QAReviewCard
            key={asset.id}
            asset={asset}
            approveAction={approveAction}
            rejectAction={rejectAction}
            rerunAction={rerunAction}
          />
        ))}
      </div>
    </section>
  );
}
