import { logger, task } from "@trigger.dev/sdk";
import { removeBackground } from "../lib/apis/fal";
import { transparentFallback } from "../lib/apis/photoroom";
import { getLatestRun, listAssets, resolveAssetUrl, saveAsset, uploadBuffer } from "../lib/state";

export const cutoutTask = task({
  id: "cutout-asset",
  run: async ({ projectId, sku }: { projectId: string; sku: string }) => {
    const run = await getLatestRun(projectId);
    const rawAsset = (await listAssets(projectId, "raw")).find((asset: { sku_id: string }) => asset.sku_id === sku);
    if (!rawAsset) {
      throw new Error(`Raw asset not found for ${sku}`);
    }

    const sourceUrl = await resolveAssetUrl(rawAsset.storage_path);
    let cutoutUrl: string;
    let provider = "fal-ai/bria/background/remove";

    try {
      cutoutUrl = await removeBackground(sourceUrl);
    } catch (error) {
      logger.warn("Primary cutout failed, using fallback", { projectId, sku, error });
      cutoutUrl = await transparentFallback(sourceUrl);
      provider = "photoroom-fallback";
    }

    const response = await fetch(cutoutUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch cutout image for ${sku}: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const storagePath = `${projectId}/cutouts/${sku}.png`;
    await uploadBuffer(storagePath, buffer, "image/png");
    const asset = await saveAsset({
      projectId,
      skuId: sku,
      kind: "cutout",
      storagePath,
      parentAssetId: rawAsset.id,
      mimeType: "image/png",
      metadata: { source: provider, runId: run.id },
      qaStatus: "pending",
    });
    if (!asset?.id) {
      throw new Error(`Failed to persist cutout asset for ${sku}`);
    }

    return { projectId, sku, rawAssetId: rawAsset.id, cutoutAssetId: asset.id, cutoutPath: storagePath, costUsd: 0.018, provider };
  },
});
