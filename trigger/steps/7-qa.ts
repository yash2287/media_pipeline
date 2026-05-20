import { task } from "@trigger.dev/sdk";
import { qaImage } from "../lib/apis/openai-image";
import { runDeterministicQa } from "../lib/imaging/qa-rules";
import {
  getBrandProfile,
  getErrorMessage,
  getLatestRun,
  getProject,
  listRunAssets,
  resolveAssetUrl,
  updateAsset,
  updateProjectStatus,
  upsertStep,
} from "../lib/state";

async function fetchBuffer(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function combineQa(opts: {
  visionScore: number;
  visionStatus: "approved" | "manual_fix" | "rejected";
  deterministic: Awaited<ReturnType<typeof runDeterministicQa>>;
}) {
  const { visionScore, visionStatus, deterministic } = opts;
  let score = visionScore;
  const notes: string[] = [];

  if (deterministic.pureWhiteBgOk === false) {
    score = Math.min(score, 60);
    notes.push("Background fails pure-white compliance.");
  }
  if (deterministic.fillRatioOk === false) {
    score = Math.min(score, 65);
    notes.push("Subject fill ratio below platform minimum.");
  }
  if (deterministic.paletteDriftOk === false) {
    score = Math.min(score, 78);
    notes.push("Color drift from brand palette detected.");
  }

  const status: "approved" | "manual_fix" | "rejected" =
    score >= 85 ? "approved" : score >= 70 ? "manual_fix" : "rejected";

  return {
    score,
    status: deterministic.pureWhiteBgOk === false || deterministic.fillRatioOk === false ? "rejected" : status,
    combinedNotes: [...notes, ...deterministic.notes],
    visionStatus,
  };
}

export const qaTask = task({
  id: "qa-assets",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({
      runId: run.id,
      stepNumber: 7,
      stepName: "QA review",
      status: "running",
      apiUsed: "openai+sharp",
      modelId: "gpt-4o-mini",
    });

    try {
      const finalAssets = await listRunAssets(projectId, "final", run.id);
      if (finalAssets.length === 0) {
        throw new Error("No final assets found for QA.");
      }

      const project = await getProject(projectId);
      const brand = await getBrandProfile(project.brand_profile_id ?? null);

      for (const asset of finalAssets) {
        const url = await resolveAssetUrl(asset.storage_path);
        const buffer = await fetchBuffer(url, `Failed to fetch final asset ${asset.id}`);

        const deterministic = await runDeterministicQa({
          buffer,
          requirePureWhiteBg: Boolean(asset.metadata?.requirePureWhiteBg),
          minFillRatio:
            typeof asset.metadata?.minFillRatio === "number"
              ? Number(asset.metadata.minFillRatio)
              : undefined,
          brandPalette: (brand?.color_palette as Array<{ hex: string }>) ?? [],
        });

        const visionQa = await qaImage(url, String(asset.metadata?.slot ?? "final asset"));
        const combined = combineQa({
          visionScore: visionQa.score,
          visionStatus: visionQa.status,
          deterministic,
        });

        await updateAsset(asset.id, {
          qa_score: combined.score,
          qa_status: combined.status,
          metadata: {
            ...(asset.metadata ?? {}),
            qa_notes: [...visionQa.notes, ...combined.combinedNotes],
            qa_deterministic: deterministic,
            qa_vision: { score: visionQa.score, status: visionQa.status, notes: visionQa.notes },
          },
        });
      }

      await updateProjectStatus(projectId, "review");

      await upsertStep({
        runId: run.id,
        stepNumber: 7,
        stepName: "QA review",
        status: "succeeded",
        apiUsed: "openai+sharp",
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
        apiUsed: "openai+sharp",
        modelId: "gpt-4o-mini",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
