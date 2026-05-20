import sharp from "sharp";
import { logger, task } from "@trigger.dev/sdk";
import { clarityUpscale } from "../lib/apis/fal";
import { pipelineGradeBuffer, type ColorGrade } from "../lib/imaging/grade";
import {
  getErrorMessage,
  getLatestRun,
  getProject,
  listRunAssets,
  resolveAssetUrl,
  saveAsset,
  upsertStep,
  uploadBuffer,
} from "../lib/state";
import { resolvePackSlots } from "../lib/packs";

async function fetchBuffer(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const enhanceTask = task({
  id: "enhance-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({
      runId: run.id,
      stepNumber: 5,
      stepName: "Enhance & upscale",
      status: "running",
      apiUsed: "fal.ai",
      modelId: "clarity-upscaler",
    });

    try {
      const generatedAssets = await listRunAssets(projectId, "generated", run.id);
      if (generatedAssets.length === 0) {
        throw new Error("No generated assets found for the current run.");
      }

      const project = await getProject(projectId);
      const brief = (project.brief as Record<string, unknown>) ?? {};
      const colorGrade = (brief.colorGrade ?? "neutral") as ColorGrade;
      const targetMarketplaces = (project.target_marketplaces as string[]) ?? [];
      const allSlots = resolvePackSlots(project.pack_type as string, targetMarketplaces);
      const slotsBySlotId = new Map(allSlots.map((s) => [s.slot, s]));

      const enhanced = [];
      let costUsd = 0;

      for (const asset of generatedAssets) {
        const baseSlot = String(asset.metadata?.baseSlot ?? asset.metadata?.slot ?? "");
        const slotSpec = slotsBySlotId.get(baseSlot);
        const needsUpscale = slotSpec?.upscaleNeeded || Math.max(slotSpec?.width ?? 0, slotSpec?.height ?? 0) > 2048;

        const sourceUrl = await resolveAssetUrl(asset.storage_path);
        let buffer: Buffer;
        let modelUsed = "sharp-passthrough";

        if (needsUpscale) {
          const enhancedUrl = await clarityUpscale(sourceUrl);
          buffer = await fetchBuffer(enhancedUrl, `Failed to fetch upscaled asset ${asset.id}`);
          modelUsed = "clarity-upscaler";
          costUsd += 0.04;
        } else {
          buffer = await fetchBuffer(sourceUrl, `Failed to fetch generated asset ${asset.id}`);
        }

        // Color grade pass
        buffer = await pipelineGradeBuffer(buffer, colorGrade);
        // Light sharpening pass — helps both small and large outputs
        buffer = await sharp(buffer).sharpen({ sigma: 0.6 }).toBuffer();

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
            source: modelUsed,
            colorGrade,
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
        costUsd: Number(costUsd.toFixed(4)),
      });

      logger.info("Enhance step completed", { count: enhanced.length, costUsd });
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
