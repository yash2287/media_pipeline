"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageUp, Package2 } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`rounded-md border border-dashed px-5 py-8 text-center ${isDragActive ? "border-[var(--purple)] bg-[var(--purple-soft)]" : "border-[var(--line)] bg-white"}`}
      >
        <input {...getInputProps({ name: "rawAssets" })} />
        <ImageUp className="mx-auto h-6 w-6 text-[var(--purple)]" />
        <div className="mt-3 text-sm font-medium text-[var(--foreground)]">Drop raw product photos or click to browse</div>
        <div className="mt-1 text-xs text-[var(--muted)]">JPEG, PNG, HEIC up to 25MB each</div>
      </div>

      <div className="grid gap-2">
        {files.length === 0 ? (
          <div className="rounded-md bg-stone-50 px-4 py-3 text-sm text-[var(--muted)]">No files selected yet.</div>
        ) : (
          files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-[var(--foreground)]">
                <Package2 className="h-4 w-4 text-[var(--teal)]" />
                {file.name}
              </div>
              <div className="text-xs text-[var(--muted)]">{Math.round(file.size / 1024 / 1024)}MB</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

