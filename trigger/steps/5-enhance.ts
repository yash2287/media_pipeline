import { task } from "@trigger.dev/sdk";
import { clarityUpscale } from "../lib/apis/fal";
import { getErrorMessage, getLatestRun, listRunAssets, resolveAssetUrl, saveAsset, upsertStep, uploadBuffer } from "../lib/state";

export const enhanceTask = task({
  id: "enhance-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({ runId: run.id, stepNumber: 5, stepName: "Enhance & upscale", status: "running", apiUsed: "fal.ai", modelId: "clarity-upscaler" });

    try {
      const generatedAssets = await listRunAssets(projectId, "generated", run.id);
      if (generatedAssets.length === 0) {
        throw new Error("No generated assets found for the current run.");
      }

      const enhanced = [];

      for (const asset of generatedAssets) {
        const sourceUrl = await resolveAssetUrl(asset.storage_path);
        const enhancedUrl = await clarityUpscale(sourceUrl);
        const response = await fetch(enhancedUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch upscaled asset ${asset.id}: ${response.status} ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const storagePath = `${projectId}/upscaled/${asset.sku_id}_${asset.id}.png`;
        await uploadBuffer(storagePath, buffer, "image/png");

        const saved = await saveAsset({
          projectId,
          skuId: asset.sku_id,
          kind: "upscaled",
          storagePath,
          parentAssetId: asset.id,
          mimeType: "image/png",
          metadata: {
            ...(asset.metadata ?? {}),
            source: "clarity-upscaler",
            runId: run.id,
          },
          qaStatus: "pending",
        });

        enhanced.push(saved);
      }

      await upsertStep({
        runId: run.id,
        stepNumber: 5,
        stepName: "Enhance & upscale",
        status: "succeeded",
        apiUsed: "fal.ai",
        modelId: "clarity-upscaler",
        inputAssetIds: generatedAssets.map((asset) => asset.id),
        outputAssetIds: enhanced.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: generatedAssets.length * 0.04,
      });

      return { projectId, count: enhanced.length };
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 5,
        stepName: "Enhance & upscale",
        status: "failed",
        apiUsed: "fal.ai",
        modelId: "clarity-upscaler",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
