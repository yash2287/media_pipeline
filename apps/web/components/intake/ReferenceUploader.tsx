"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReferenceUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [tag, setTag] = useState("mood");

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((current) => [...current, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
  });

  return (
    <div className="space-y-3">
      <input type="hidden" name="referenceTag" value={tag} />
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { value: "mood", label: "Mood board" },
          { value: "competitor", label: "Competitor" },
          { value: "previous_winner", label: "Previous winner" },
          { value: "brand_asset", label: "Brand asset" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTag(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              tag === opt.value
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-2)]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-[12px] border-2 border-dashed px-5 py-7 text-center transition-all",
          isDragActive
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--line-2)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40",
        )}
      >
        <input {...getInputProps({ name: "referenceAssets" })} />
        <ImagePlus className="mx-auto h-5 w-5 text-[var(--accent)]" />
        <div className="mt-2 text-[13px] font-semibold text-[var(--ink)]">
          {isDragActive ? "Drop reference images" : "Drop mood, competitor or brand reference images"}
        </div>
        <div className="mt-1 text-[11.5px] text-[var(--ink-3)]">
          Up to 3 references will be passed to gpt-image-2 as style anchors.
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[12.5px]"
            >
              <span className="truncate text-[var(--ink)]">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((current) => current.filter((_, i) => i !== idx))}
                className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--rose)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
