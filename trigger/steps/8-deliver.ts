import { task } from "@trigger.dev/sdk";
import { createDeliveryBundle } from "../lib/apis/gdrive";
import { getErrorMessage, getLatestRun, listRunAssets, updateProjectStatus, updateRun, upsertStep } from "../lib/state";

export const deliverTask = task({
  id: "deliver-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({ runId: run.id, stepNumber: 8, stepName: "Delivery", status: "running", apiUsed: "bundle-export" });

    try {
      const finalAssets = (await listRunAssets(projectId, "final", run.id)).filter((asset) => asset.qa_status === "approved");
      if (finalAssets.length === 0) {
        throw new Error("No approved final assets are available for delivery.");
      }

      const delivery = await createDeliveryBundle({
        projectId,
        assetPaths: finalAssets.map((asset) => asset.storage_path),
      });

      await updateProjectStatus(projectId, "delivered", {
        delivery_url: delivery.shareUrl,
      });
      await updateRun(run.id, { status: "completed", completed_at: new Date().toISOString() });

      await upsertStep({
        runId: run.id,
        stepNumber: 8,
        stepName: "Delivery",
        status: "succeeded",
        apiUsed: delivery.provider,
        inputAssetIds: finalAssets.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: 0,
      });

      return delivery;
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 8,
        stepName: "Delivery",
        status: "failed",
        apiUsed: "bundle-export",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
