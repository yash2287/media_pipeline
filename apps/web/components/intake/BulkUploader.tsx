"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageUp, FileImage, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BulkUploader() {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((current) => [...current, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 25 * 1024 * 1024,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/heic": [".heic"],
    },
  });

  const totalMb = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-[14px] border-2 border-dashed px-6 py-10 text-center transition-all",
          isDragActive
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--line-2)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40",
        )}
      >
        <input {...getInputProps({ name: "rawAssets" })} />
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--surface)] border border-[var(--line)] text-[var(--accent)] shadow-[var(--shadow-sm)]">
          <ImageUp className="h-5 w-5" />
        </div>
        <div className="mt-4 text-[14px] font-semibold text-[var(--ink)]">
          {isDragActive ? "Drop to upload" : "Drag photos here or click to browse"}
        </div>
        <div className="mt-1 text-[12px] text-[var(--ink-3)]">
          JPEG · PNG · HEIC · up to 25 MB each
        </div>
      </div>

      {files.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <span>{files.length} file{files.length === 1 ? "" : "s"} queued</span>
            <span className="mono">{totalMb.toFixed(1)} MB total</span>
          </div>
          <div className="grid gap-1.5">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--surface-3)] text-[var(--accent)]">
                    <FileImage className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--ink)]">{file.name}</div>
                    <div className="mono text-[11px] text-[var(--muted)]">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) => current.filter((_, i) => i !== index))
                  }
                  aria-label={`Remove ${file.name}`}
                  className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--rose)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[12.5px] text-[var(--ink-3)]">
          No files selected yet. Files will be uploaded during the next pipeline run.
        </div>
      )}
    </div>
  );
}
