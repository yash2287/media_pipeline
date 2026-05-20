"use client";

import { useState } from "react";
import { MoreVertical, Trash2, X } from "lucide-react";
import { deleteProjectAction } from "@/app/(operator)/projects/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteProjectMenu({
  projectId,
  clientName,
}: {
  projectId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Project options"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className={cn("panel-raise w-full max-w-md p-5 animate-fade-up")}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow flex items-center gap-1.5 text-[var(--rose)]">
                  <Trash2 className="h-3 w-3" />
                  Delete project
                </div>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.005em] text-[var(--ink)]">
                  {clientName}
                </h2>
                <p className="mt-2 text-[12.5px] leading-5 text-[var(--ink-3)]">
                  This removes the project, all pipeline runs and steps, and every stored asset (raw,
                  cutout, generated, upscaled, final, companion, deliveries). The action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={deleteProjectAction} className="mt-5 space-y-3">
              <input type="hidden" name="projectId" value={projectId} />
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                Type <span className="mono text-[var(--rose)]">DELETE</span> to confirm
              </label>
              <input
                type="text"
                name="confirm"
                required
                autoFocus
                autoComplete="off"
                placeholder="DELETE"
                className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:border-[var(--rose)] focus:outline-none focus:ring-4 focus:ring-[rgba(185,28,75,0.18)]"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  <Trash2 className="h-4 w-4" />
                  Delete project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
