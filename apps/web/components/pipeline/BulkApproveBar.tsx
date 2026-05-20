"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BulkApproveBar({
  projectId,
  candidates,
  bulkApproveAction,
}: {
  projectId: string;
  candidates: Array<{ qaScore: number | null; qaStatus: string }>;
  bulkApproveAction: (formData: FormData) => Promise<void>;
}) {
  const [threshold, setThreshold] = useState(85);

  const eligible = candidates.filter(
    (c) => c.qaStatus !== "approved" && (c.qaScore ?? 0) >= threshold,
  ).length;

  return (
    <form
      action={bulkApproveAction}
      className="panel-quiet flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-center gap-3">
        <div className="text-[13px] font-semibold text-[var(--ink)]">
          Bulk approve
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
          <span>QA score ≥</span>
          <input
            type="range"
            name="threshold"
            min={60}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-1 w-44 accent-[var(--accent)]"
          />
          <span className="mono text-[12.5px] font-semibold text-[var(--ink)]">{threshold}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="chip mono">{eligible} eligible</span>
        <Button type="submit" variant="accent" size="sm" disabled={eligible === 0}>
          <Check className="h-3.5 w-3.5" />
          Approve {eligible}
        </Button>
      </div>
    </form>
  );
}
