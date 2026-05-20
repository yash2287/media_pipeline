import { task } from "@trigger.dev/sdk";
import { createDeliveryBundle } from "../lib/apis/gdrive";
import {
  getBrandProfile,
  getErrorMessage,
  getLatestRun,
  getProject,
  listAssets,
  listRunAssets,
  updateProjectStatus,
  updateRun,
  upsertStep,
} from "../lib/state";

export const deliverTask = task({
  id: "deliver-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({
      runId: run.id,
      stepNumber: 8,
      stepName: "Delivery",
      status: "running",
      apiUsed: "bundle-export",
    });

    try {
      const project = await getProject(projectId);
      const brand = await getBrandProfile(project.brand_profile_id ?? null);
      const brief = (project.brief as Record<string, unknown>) ?? {};

      const finalAssets = (await listRunAssets(projectId, "final", run.id)).filter(
        (asset) => asset.qa_status === "approved",
      );
      if (finalAssets.length === 0) {
        throw new Error("No approved final assets are available for delivery.");
      }

      const companionAssets = await listAssets(projectId, "companion");
      const approvedFinalIds = new Set(finalAssets.map((a) => a.id));
      const relevantCompanions = companionAssets.filter((c) =>
        approvedFinalIds.has(String(c.parent_asset_id ?? "")),
      );

      // Map sku → productType from intake
      const rawAssets = await listAssets(projectId, "raw");
      const productTypeBySku: Record<string, string> = {};
      for (const ra of rawAssets) {
        const pt = String((ra.metadata as Record<string, unknown>)?.intake
          ? (((ra.metadata as Record<string, unknown>).intake as Record<string, unknown>)?.productType ?? "")
          : "");
        if (pt) productTypeBySku[ra.sku_id] = pt;
      }

      const delivery = await createDeliveryBundle({
        projectId,
        assets: finalAssets,
        companionAssets: relevantCompanions,
        brandName: brand?.name ?? undefined,
        productTypeBySku,
        brief: {
          hook: (brief as { hook?: string }).hook,
          cta: (brief as { cta?: string }).cta,
          tone: (brief as { tone?: string[] }).tone,
          captionAutoGen: (brief as { captionAutoGen?: boolean }).captionAutoGen ?? false,
          generateListingCsv: (brief as { generateListingCsv?: boolean }).generateListingCsv ?? true,
        },
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
