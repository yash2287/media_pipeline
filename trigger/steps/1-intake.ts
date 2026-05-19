import { logger, task } from "@trigger.dev/sdk";
import { analyzeProductImage } from "../lib/apis/openai-image";
import { getErrorMessage, getLatestRun, listAssets, resolveAssetUrl, updateAsset, upsertStep } from "../lib/state";

export const intakeTask = task({
  id: "intake-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({
      runId: run.id,
      stepNumber: 1,
      stepName: "Intake & validation",
      status: "running",
      apiUsed: "openai",
      modelId: "gpt-4o-mini",
    });

    try {
      const rawAssets = await listAssets(projectId, "raw");
      if (rawAssets.length === 0) {
        throw new Error("No raw assets found for intake.");
      }

      const results = [];

      for (const asset of rawAssets) {
        const sourceUrl = await resolveAssetUrl(asset.storage_path);
        const analysis = await analyzeProductImage(sourceUrl);
        const metadata = {
          ...(asset.metadata ?? {}),
          intake: analysis,
        };

        await updateAsset(asset.id, {
          metadata,
        });

        results.push({
          assetId: asset.id,
          sku: asset.sku_id,
          metadata: analysis,
        });
      }

      await upsertStep({
        runId: run.id,
        stepNumber: 1,
        stepName: "Intake & validation",
        status: "succeeded",
        apiUsed: "openai",
        modelId: "gpt-4o-mini",
        inputAssetIds: rawAssets.map((asset) => asset.id),
        outputAssetIds: rawAssets.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: rawAssets.length * 0.002,
      });

      logger.info("Validated intake assets", { projectId, count: rawAssets.length });

      return {
        projectId,
        items: results,
      };
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 1,
        stepName: "Intake & validation",
        status: "failed",
        apiUsed: "openai",
        modelId: "gpt-4o-mini",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
