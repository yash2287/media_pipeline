import Image from "next/image";
import { Check, RotateCcw, X } from "lucide-react";
import type { Asset } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, titleCase } from "@/lib/utils";

function scoreTone(score: number | null) {
  if (score == null) return "text-[var(--muted)]";
  if (score >= 85) return "text-[var(--teal)]";
  if (score >= 70) return "text-[var(--amber)]";
  return "text-[var(--rose)]";
}

function ScoreRing({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const tone =
    score == null
      ? "stroke-[var(--line-2)]"
      : pct >= 85
      ? "stroke-[var(--teal)]"
      : pct >= 70
      ? "stroke-[var(--amber)]"
      : "stroke-[var(--rose)]";

  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} className="fill-none stroke-[var(--line)]" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className={cn("fill-none transition-[stroke-dashoffset] duration-500", tone)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className={cn("mono text-[18px] font-semibold leading-none", scoreTone(score))}>
          {score ?? "—"}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">QA</span>
      </div>
    </div>
  );
}

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
  const slot = asset.metadata?.slot ? titleCase(String(asset.metadata.slot)) : "Final";
  const model = asset.metadata?.model ? String(asset.metadata.model) : null;
  const prompt = asset.metadata?.prompt ? String(asset.metadata.prompt) : null;

  return (
    <div className="panel-raise overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.25fr_1fr]">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[var(--surface-3)] p-3 md:aspect-auto md:min-h-[420px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5] grid-bg"
          />
          <div className="relative h-full w-full">
            <Image
              src={asset.storagePath}
              alt={asset.skuId}
              fill
              unoptimized
              className="object-contain"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            {slot}
          </div>
          {asset.width && asset.height ? (
            <div className="absolute bottom-3 right-3 z-10 mono inline-flex items-center rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              {asset.width}×{asset.height}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 border-l border-[var(--line)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] mono">
                {asset.skuId}
              </div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.005em] text-[var(--ink)]">
                {slot}
              </div>
              <div className="mt-1 text-[12px] text-[var(--ink-3)]">
                {asset.width && asset.height ? (
                  <span className="mono">{asset.width}×{asset.height}px · </span>
                ) : null}
                {model ? <span className="mono">{model}</span> : "Generated output"}
              </div>
            </div>
            <ScoreRing score={asset.qaScore} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge value={asset.qaStatus} />
            {asset.metadata?.runId ? (
              <span className="chip mono">run · {String(asset.metadata.runId).slice(0, 8)}</span>
            ) : null}
          </div>

          {prompt ? (
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Prompt
              </div>
              <p className="mono mt-1 line-clamp-4 text-[12px] leading-5 text-[var(--ink-2)]">
                {prompt}
              </p>
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            <form action={approveAction} className="flex-1">
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="accent" className="w-full">
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </form>
            <form action={rerunAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="secondary">
                <RotateCcw className="h-4 w-4" />
                Re-run
              </Button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="projectId" value={asset.projectId} />
              <Button type="submit" variant="outline">
                <X className="h-4 w-4" />
                Reject
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
