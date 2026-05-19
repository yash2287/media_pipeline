import sharp from "sharp";
import { task } from "@trigger.dev/sdk";
import { packSpecs } from "../lib/packs";
import { getErrorMessage, getLatestRun, getProject, listRunAssets, resolveAssetUrl, saveAsset, upsertStep, uploadBuffer } from "../lib/state";

export const adaptTask = task({
  id: "adapt-formats",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({ runId: run.id, stepNumber: 6, stepName: "Multi-format adaptation", status: "running", apiUsed: "sharp" });

    try {
      const project = await getProject(projectId);
      const specs = packSpecs[(project.pack_type as keyof typeof packSpecs) ?? "marketplace"];
      const sourceAssets = await listRunAssets(projectId, "upscaled", run.id);
      if (sourceAssets.length === 0) {
        throw new Error("No upscaled assets found for the current run.");
      }

      const created = [];

      for (const asset of sourceAssets) {
        const slot = String(asset.metadata?.slot ?? "");
        const spec = specs.find((candidate) => candidate.slot === slot);
        if (!spec) {
          throw new Error(`No pack spec found for slot "${slot}" on asset ${asset.id}.`);
        }

        const url = await resolveAssetUrl(asset.storage_path);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch upscaled asset ${asset.id}: ${response.status} ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const output = await sharp(buffer).resize(spec.width, spec.height, { fit: "cover" }).toFormat(spec.format as "jpeg" | "png").toBuffer();
        const ext = spec.format === "png" ? "png" : "jpg";
        const storagePath = `${projectId}/final/${asset.sku_id}_${spec.slot}_${asset.id}.${ext}`;
        await uploadBuffer(storagePath, output, spec.format === "png" ? "image/png" : "image/jpeg");

        const saved = await saveAsset({
          projectId,
          skuId: asset.sku_id,
          kind: "final",
          storagePath,
          parentAssetId: asset.id,
          mimeType: spec.format === "png" ? "image/png" : "image/jpeg",
          width: spec.width,
          height: spec.height,
          metadata: {
            ...(asset.metadata ?? {}),
            slot: spec.slot,
            pack: project.pack_type,
            runId: run.id,
          },
          qaStatus: "pending",
        });

        created.push(saved);
      }

      await upsertStep({
        runId: run.id,
        stepNumber: 6,
        stepName: "Multi-format adaptation",
        status: "succeeded",
        apiUsed: "sharp",
        inputAssetIds: sourceAssets.map((asset) => asset.id),
        outputAssetIds: created.map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: 0,
      });

      return { projectId, count: created.length };
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 6,
        stepName: "Multi-format adaptation",
        status: "failed",
        apiUsed: "sharp",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
