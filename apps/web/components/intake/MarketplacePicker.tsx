"use client";

import { useEffect, useState } from "react";
import { PIPELINE_AUTOFILL_EVENT } from "@/components/intake/BriefAutofillPanel";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "amazon", label: "Amazon", packs: ["marketplace"] },
  { value: "etsy", label: "Etsy", packs: ["marketplace"] },
  { value: "shopify", label: "Shopify", packs: ["marketplace"] },
  { value: "flipkart", label: "Flipkart", packs: ["marketplace"] },
  { value: "meesho", label: "Meesho", packs: ["marketplace"] },
  { value: "instagram", label: "Instagram", packs: ["social"] },
  { value: "pinterest", label: "Pinterest", packs: ["social"] },
  { value: "linkedin", label: "LinkedIn", packs: ["social"] },
  { value: "tiktok", label: "TikTok", packs: ["social"] },
];

export function MarketplacePicker({
  defaultPackType = "marketplace",
  defaultMarketplaces = [],
}: {
  defaultPackType?: string;
  defaultMarketplaces?: string[];
}) {
  const [packType, setPackType] = useState(defaultPackType);
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultMarketplaces));

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<{
        packType?: string;
        targetMarketplaces?: string[];
      }>).detail;
      if (!detail) return;
      if (detail.packType) setPackType(detail.packType);
      if (Array.isArray(detail.targetMarketplaces)) {
        setSelected(new Set(detail.targetMarketplaces));
      }
    }
    window.addEventListener(PIPELINE_AUTOFILL_EVENT, handler);
    return () => window.removeEventListener(PIPELINE_AUTOFILL_EVENT, handler);
  }, []);

  const visible = OPTIONS.filter((o) => o.packs.includes(packType));

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="packType"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]"
        >
          Pack type
        </label>
        <select
          id="packType"
          name="packType"
          value={packType}
          onChange={(e) => {
            setPackType(e.target.value);
            setSelected(new Set());
          }}
          className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] transition-colors hover:border-[var(--line-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)]"
        >
          <option value="marketplace">Marketplace Launch</option>
          <option value="social">Social Campaign</option>
          <option value="premium">Premium AI Photoshoot</option>
          <option value="catalog">Catalog Refresh</option>
        </select>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
          Target marketplaces
        </div>
        {visible.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] px-3 py-3 text-[12.5px] text-[var(--ink-3)]">
            Premium and Catalog packs deliver universal outputs. Marketplace filter is not used.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((opt) => {
              const active = selected.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-2)]",
                  )}
                >
                  <input
                    type="checkbox"
                    name="targetMarketplaces"
                    value={opt.value}
                    checked={active}
                    onChange={() => toggle(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        )}
        <p className="mt-1.5 text-[11.5px] text-[var(--muted)]">
          Each platform contributes its own slot set. Leave empty to generate the full pack.
        </p>
      </div>
    </div>
  );
}
