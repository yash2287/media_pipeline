import Image from "next/image";
import type { Asset } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function AssetGrid({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => (
        <article key={asset.id} className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="relative aspect-square bg-stone-100">
            <Image src={asset.storagePath} alt={asset.skuId} fill className="object-cover" unoptimized />
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-[var(--foreground)]">{asset.skuId}</div>
              <Badge value={asset.qaStatus} />
            </div>
            <div className="text-xs text-[var(--muted)]">
              {asset.kind} • {String(asset.metadata.slot ?? "source")}
            </div>
            {asset.qaScore ? <div className="text-xs font-medium text-[var(--foreground)]">QA {asset.qaScore}/100</div> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

