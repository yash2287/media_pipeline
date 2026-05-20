import { logger, task } from "@trigger.dev/sdk";
import { analyzeProductImage } from "../lib/apis/openai-image";
import { aHash, hammingDistance } from "../lib/imaging/hash";
import {
  getErrorMessage,
  getLatestRun,
  getProject,
  listAssets,
  resolveAssetUrl,
  updateAsset,
  upsertStep,
} from "../lib/state";

async function fetchBuffer(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

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

      // Load any per-SKU metadata supplied by the operator
      const project = await getProject(projectId);
      const briefSkus = ((project.brief as Record<string, unknown>)?.skus ?? []) as Array<{
        id: string;
        name?: string;
        material?: string;
        keyFeature?: string;
        priceTier?: string;
      }>;
      const skuMetaById = new Map(briefSkus.map((s) => [s.id, s]));

      // Perceptual-hash dedup. If a near-duplicate exists, mark it as duplicate and skip vision call.
      const hashes = new Map<string, string>(); // hash -> assetId
      const duplicateAssetIds = new Set<string>();
      for (const asset of rawAssets) {
        try {
          const url = await resolveAssetUrl(asset.storage_path);
          const buffer = await fetchBuffer(url, `Failed to fetch raw asset ${asset.id}`);
          const hash = await aHash(buffer);

          let isDup = false;
          for (const [otherHash, otherId] of hashes) {
            if (hammingDistance(hash, otherHash) <= 4) {
              isDup = true;
              await updateAsset(asset.id, {
                metadata: {
                  ...(asset.metadata ?? {}),
                  pHash: hash,
                  duplicateOf: otherId,
                },
              });
              duplicateAssetIds.add(asset.id);
              break;
            }
          }
          if (!isDup) {
            hashes.set(hash, asset.id);
            await updateAsset(asset.id, {
              metadata: { ...(asset.metadata ?? {}), pHash: hash },
            });
          }
        } catch (err) {
          logger.warn("Hashing failed for raw asset — keeping it", { asset: asset.id, err });
        }
      }

      const dedupedAssets = rawAssets.filter((asset) => !duplicateAssetIds.has(asset.id));

      const results = [];
      for (const asset of dedupedAssets) {
        const sourceUrl = await resolveAssetUrl(asset.storage_path);
        const analysis = await analyzeProductImage(sourceUrl);
        const skuMeta = skuMetaById.get(asset.sku_id);
        const enrichedAnalysis = {
          ...analysis,
          ...(skuMeta?.name ? { productType: skuMeta.name } : {}),
          skuMeta: skuMeta ?? null,
        };

        await updateAsset(asset.id, {
          metadata: {
            ...(asset.metadata ?? {}),
            intake: enrichedAnalysis,
          },
        });

        results.push({
          assetId: asset.id,
          sku: asset.sku_id,
          metadata: enrichedAnalysis,
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
        outputAssetIds: dedupedAssets.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: Number((dedupedAssets.length * 0.002).toFixed(4)),
      });

      logger.info("Validated intake assets", {
        projectId,
        accepted: dedupedAssets.length,
        duplicates: duplicateAssetIds.size,
      });

      return { projectId, items: results, duplicates: duplicateAssetIds.size };
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
