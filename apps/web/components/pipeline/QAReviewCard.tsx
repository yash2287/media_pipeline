import Image from "next/image";
import type { Asset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function QAReviewCard({
  asset,
  approveAction,
  rejectAction,
  rerunAction,
}: {
  asset: Asset;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  rerunAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
      <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
        <div className="relative aspect-[5/4] bg-stone-100">
          <Image src={asset.storagePath} alt={asset.skuId} fill className="object-cover" unoptimized />
        </div>
        <div className="flex flex-col justify-between border-l border-[var(--line)] p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{asset.skuId}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{String(asset.metadata.slot ?? "final")}</div>
              </div>
              <Badge value={asset.qaStatus} />
            </div>
            <div className="mt-4 rounded-md bg-stone-50 px-3 py-3 text-sm">
              <div className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Auto QA</div>
              <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">{asset.qaScore ?? "Pending"}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={approveAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="secondary">
                Approve
              </Button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="danger">
                Reject
              </Button>
            </form>
            <form action={rerunAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="outline">
                Re-run
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
