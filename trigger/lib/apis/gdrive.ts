import JSZip from "jszip";
import { resolveAssetUrl, uploadBuffer } from "../state";

async function fetchAssetBuffer(storagePath: string) {
  const signedUrl = await resolveAssetUrl(storagePath);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch delivery asset ${storagePath}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function zipEntryName(projectId: string, storagePath: string) {
  const withoutPrefix = storagePath.replace(`${projectId}/final/`, "");
  return withoutPrefix || storagePath.split("/").at(-1) || "asset.bin";
}

export async function createDeliveryBundle(opts: { projectId: string; assetPaths: string[] }) {
  if (opts.assetPaths.length === 0) {
    throw new Error("No final assets available to include in the delivery bundle.");
  }

  const zip = new JSZip();
  for (const storagePath of opts.assetPaths) {
    const buffer = await fetchAssetBuffer(storagePath);
    zip.file(zipEntryName(opts.projectId, storagePath), buffer);
  }

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const storagePath = `${opts.projectId}/deliveries/${Date.now()}-approved-assets.zip`;
  await uploadBuffer(storagePath, archive, "application/zip");
  const shareUrl = await resolveAssetUrl(storagePath, 7 * 24 * 60 * 60);

  return {
    provider: "supabase-storage",
    bundlePath: storagePath,
    folderId: storagePath,
    shareUrl,
  };
}
