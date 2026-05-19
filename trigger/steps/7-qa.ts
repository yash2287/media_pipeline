import { task } from "@trigger.dev/sdk";
import { qaImage } from "../lib/apis/openai-image";
import { getErrorMessage, getLatestRun, listRunAssets, resolveAssetUrl, updateAsset, updateProjectStatus, upsertStep } from "../lib/state";

export const qaTask = task({
  id: "qa-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({ runId: run.id, stepNumber: 7, stepName: "QA review", status: "running", apiUsed: "openai", modelId: "gpt-4o-mini" });

    try {
      const finalAssets = await listRunAssets(projectId, "final", run.id);
      if (finalAssets.length === 0) {
        throw new Error("No final assets found for QA.");
      }

      for (const asset of finalAssets) {
        const url = await resolveAssetUrl(asset.storage_path);
        const qa = await qaImage(url, String(asset.metadata?.slot ?? "final asset"));
        await updateAsset(asset.id, {
          qa_score: qa.score,
          qa_status: qa.status,
          metadata: {
            ...(asset.metadata ?? {}),
            qa_notes: qa.notes,
          },
        });
      }

      await updateProjectStatus(projectId, "review");
      await upsertStep({
        runId: run.id,
        stepNumber: 7,
        stepName: "QA review",
        status: "succeeded",
        apiUsed: "openai",
        modelId: "gpt-4o-mini",
        inputAssetIds: finalAssets.map((asset) => asset.id),
        outputAssetIds: finalAssets.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: finalAssets.length * 0.002,
      });

      return { projectId, count: finalAssets.length, status: "ready_for_review" };
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 7,
        stepName: "QA review",
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
