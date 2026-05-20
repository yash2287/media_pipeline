"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImageIcon, Layers, Sparkles, Wand2 } from "lucide-react";
import type { Asset, AssetKind } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, titleCase } from "@/lib/utils";

type Filter = "all" | AssetKind;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "final", label: "Final" },
  { key: "upscaled", label: "Upscaled" },
  { key: "generated", label: "Generated" },
  { key: "cutout", label: "Cutout" },
  { key: "raw", label: "Raw" },
];

function QaRing({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.max(0, Math.min(100, score));
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const tone =
    pct >= 85
      ? "stroke-[var(--teal)]"
      : pct >= 70
      ? "stroke-[var(--amber)]"
      : "stroke-[var(--rose)]";

  return (
    <div className="relative grid h-9 w-9 place-items-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} className="fill-none stroke-white/40" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          className={cn("fill-none transition-[stroke-dashoffset] duration-500", tone)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
        />
      </svg>
      <span className="relative mono text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        {pct}
      </span>
    </div>
  );
}

function kindIcon(kind: AssetKind) {
  if (kind === "final" || kind === "upscaled") return Sparkles;
  if (kind === "generated") return Wand2;
  if (kind === "cutout") return Layers;
  return ImageIcon;
}

function AssetCard({ asset }: { asset: Asset }) {
  const Icon = kindIcon(asset.kind);
  const slot = asset.metadata?.slot ? String(asset.metadata.slot) : null;
  const dims = asset.width && asset.height ? `${asset.width}×${asset.height}` : null;

  return (
    <article className="group relative overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)]">
      <div className="relative aspect-square overflow-hidden bg-[var(--surface-3)]">
        <Image
          src={asset.storagePath}
          alt={asset.skuId}
          fill
          unoptimized
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 33vw, 50vw"
        />

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
          <Icon className="h-3 w-3" />
          {asset.kind}
        </div>

        {asset.qaScore != null ? (
          <div className="absolute right-2.5 top-2.5">
            <QaRing score={asset.qaScore} />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center justify-between gap-2 text-[11px] text-white">
            <div className="truncate">
              <div className="font-semibold tracking-[-0.005em]">{asset.skuId}</div>
              {slot ? <div className="truncate text-white/75">{titleCase(slot)}</div> : null}
            </div>
            {dims ? <span className="mono shrink-0 text-white/85">{dims}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{asset.skuId}</div>
          <div className="truncate text-[11.5px] text-[var(--ink-3)]">
            {titleCase(asset.kind)}
            {slot ? <span className="text-[var(--muted)]"> · {titleCase(slot)}</span> : null}
          </div>
        </div>
        <Badge value={asset.qaStatus} />
      </div>
    </article>
  );
}

export function AssetGrid({
  assets,
  showFilter = true,
  emptyTitle = "No assets yet",
  emptyDescription = "Run the pipeline to generate creative outputs.",
}: {
  assets: Asset[];
  showFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    map.set("all", assets.length);
    for (const a of assets) {
      map.set(a.kind, (map.get(a.kind) ?? 0) + 1);
    }
    return map;
  }, [assets]);

  const filtered = filter === "all" ? assets : assets.filter((a) => a.kind === filter);

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      {showFilter ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const count = counts.get(f.key) ?? 0;
            const disabled = count === 0 && f.key !== "all";
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                disabled={disabled}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:bg-[var(--surface-2)]",
                  disabled && "cursor-not-allowed opacity-40 hover:bg-[var(--surface)]",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "mono text-[10.5px]",
                    active ? "text-white/70" : "text-[var(--muted)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title="No assets in this view"
          description="Switch filter or run the pipeline to populate this category."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
