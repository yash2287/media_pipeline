import { logger, task } from "@trigger.dev/sdk";
import { enhanceTask } from "./steps/5-enhance";
import { qaTask } from "./steps/7-qa";
import { adaptTask } from "./steps/6-adapt";
import { cutoutTask } from "./steps/2-cutout";
import { generateSceneTask } from "./steps/4-generate";
import { intakeTask } from "./steps/1-intake";
import { promptsTask } from "./steps/3-prompts";
import {
  getErrorMessage,
  getLatestRun,
  listAssets,
  listRunAssets,
  updateProjectStatus,
  updateRun,
  upsertStep,
} from "./lib/state";

function unwrapTaskResult<T>(result: { ok: boolean; output?: T; error?: unknown }, label: string): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${getErrorMessage(result.error)}`);
  }

  return result.output as T;
}

type PipelinePayload = {
  projectId: string;
  resumeFromStep?: number;
};

type IntakeResult = {
  projectId: string;
  items: Array<{ assetId: string; sku: string; metadata: Record<string, unknown> }>;
  duplicates: number;
};

type CutoutResult = {
  projectId: string;
  sku: string;
  rawAssetId: string | null;
  cutoutAssetId: string;
  cutoutPath: string;
  costUsd?: number;
  provider?: string;
};

type GenerationResult = {
  assetId: string;
  sku: string;
  slotId: string;
  storagePath: string;
  costUsd?: number;
  rerunFinalAssetId?: string | null;
};

function normalizeResumeFromStep(value: unknown) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(7, Math.floor(parsed)));
}

async function reconstructIntakeResult(projectId: string): Promise<IntakeResult> {
  const rawAssets = await listAssets(projectId, "raw");
  const items = rawAssets
    .filter((asset) => !asset.metadata?.duplicateOf)
    .map((asset) => ({
      assetId: asset.id,
      sku: asset.sku_id,
      metadata: ((asset.metadata?.intake as Record<string, unknown> | undefined) ?? {}),
    }));

  if (items.length === 0) {
    throw new Error("Cannot resume: no previously validated intake assets were found.");
  }

  return {
    projectId,
    items,
    duplicates: rawAssets.length - items.length,
  };
}

async function reconstructCutouts(projectId: string, runId: string): Promise<CutoutResult[]> {
  const cutouts = await listRunAssets(projectId, "cutout", runId);
  if (cutouts.length === 0) {
    throw new Error("Cannot resume: no cutout assets were found for this run.");
  }

  return cutouts.map((asset) => ({
    projectId,
    sku: asset.sku_id,
    rawAssetId: asset.parent_asset_id ?? null,
    cutoutAssetId: asset.id,
    cutoutPath: asset.storage_path,
    costUsd: 0,
    provider: String(asset.metadata?.source ?? "resumed"),
  }));
}

function generatedKey(item: { sku: string; slotId: string }) {
  return `${item.sku}::${item.slotId}`;
}

export const runPipelineTask = task({
  id: "run-pipeline",
  ttl: "1h",
  maxDuration: 60 * 60,
  // One retry on top of the initial attempt. Dev-mode disconnects produce
  // TASK_RUN_STALLED_EXECUTING_WITH_WAITPOINTS, which IS retryable; the resume
  // path (driven by `resumeFromStep` + per-stage reconstruction from the DB)
  // makes a re-attempt cheap because completed children are picked up rather
  // than re-run. Keep this conservative — too many retries can hide real bugs.
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 10_000,
    factor: 2,
  },
  run: async ({ projectId, resumeFromStep }: PipelinePayload) => {
    const run = await getLatestRun(projectId);
    const startAtStep = normalizeResumeFromStep(resumeFromStep);

    await updateRun(run.id, {
      status: "running",
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    });
    await updateProjectStatus(projectId, "running");

    try {
      if (startAtStep <= 4) {
      const intakeResult =
        startAtStep <= 1
          ? unwrapTaskResult(
              await intakeTask.triggerAndWait({ projectId }),
              "Intake step",
            )
          : await reconstructIntakeResult(projectId);

      const cutoutStarted = Date.now();
      await upsertStep({
        runId: run.id,
        stepNumber: 2,
        stepName: "Background removal",
        status: "running",
        apiUsed: "fal.ai",
        modelId: "fal-ai/bria/background/remove",
        inputAssetIds: intakeResult.items.map((item) => item.assetId),
      });

      let successfulCutouts;
      try {
        if (startAtStep > 2) {
          successfulCutouts = await reconstructCutouts(projectId, run.id);
        } else {
          const existingCutouts = await listRunAssets(projectId, "cutout", run.id);
          const existingBySku = new Map(existingCutouts.map((asset) => [asset.sku_id, asset]));
          const missingItems = intakeResult.items.filter((item: { sku: string }) => !existingBySku.has(item.sku));

          const newCutouts =
            missingItems.length > 0
              ? (
                  await cutoutTask.batchTriggerAndWait(
                    missingItems.map((item: { sku: string }) => ({
                      payload: { projectId, sku: item.sku },
                    })),
                  )
                ).runs.map((result, index) =>
                  unwrapTaskResult(result, `Cutout step for ${missingItems[index]?.sku ?? "unknown sku"}`),
                )
              : [];

          successfulCutouts = [
            ...existingCutouts.map((asset) => ({
              projectId,
              sku: asset.sku_id,
              rawAssetId: asset.parent_asset_id ?? null,
              cutoutAssetId: asset.id,
              cutoutPath: asset.storage_path,
              costUsd: 0,
              provider: String(asset.metadata?.source ?? "resumed"),
            })),
            ...newCutouts,
          ];
        }

        await upsertStep({
          runId: run.id,
          stepNumber: 2,
          stepName: "Background removal",
          status: "succeeded",
          apiUsed: "fal.ai",
          modelId: "fal-ai/bria/background/remove",
          inputAssetIds: intakeResult.items.map((item) => item.assetId),
          outputAssetIds: successfulCutouts.map((item) => item.cutoutAssetId),
          durationMs: Date.now() - cutoutStarted,
          costUsd: Number(successfulCutouts.reduce((sum, item) => sum + Number(item.costUsd ?? 0), 0).toFixed(4)),
        });
      } catch (error) {
        await upsertStep({
          runId: run.id,
          stepNumber: 2,
          stepName: "Background removal",
          status: "failed",
          apiUsed: "fal.ai",
          modelId: "fal-ai/bria/background/remove",
          inputAssetIds: intakeResult.items.map((item) => item.assetId),
          durationMs: Date.now() - cutoutStarted,
          error: getErrorMessage(error),
        });
        throw error;
      }

      if (startAtStep <= 4) {
        const promptResult = unwrapTaskResult(
          await promptsTask.triggerAndWait({ projectId, cutouts: successfulCutouts, intakeItems: intakeResult.items }),
          "Prompt step",
        );

        const generationStarted = Date.now();
        await upsertStep({
          runId: run.id,
          stepNumber: 4,
          stepName: "Scene generation",
          status: "running",
          apiUsed: "openai",
          modelId: "gpt-image-2",
          inputAssetIds: successfulCutouts.map((item) => item.cutoutAssetId),
        });

        try {
          const existingGeneratedAssets = await listRunAssets(projectId, "generated", run.id);
          const existingGenerated = existingGeneratedAssets.map((asset) => ({
            assetId: asset.id,
            sku: asset.sku_id,
            slotId: String(asset.metadata?.slot ?? ""),
            storagePath: asset.storage_path,
            costUsd: 0,
            rerunFinalAssetId: null,
          }));
          const existingGeneratedKeys = new Set(existingGenerated.map(generatedKey));
          const missingSlots = promptResult.slots.filter((slot) => !existingGeneratedKeys.has(generatedKey(slot)));
          const newGeneratedAssets =
            missingSlots.length > 0
              ? (
                  await generateSceneTask.batchTriggerAndWait(
                    missingSlots.map((slot) => ({
                      payload: slot,
                    })),
                  )
                ).runs.map((result, index) =>
                  unwrapTaskResult(result, `Generation step ${missingSlots[index]?.slotId ?? index + 1}`),
                )
              : [];
          const generatedAssets: GenerationResult[] = [...existingGenerated, ...newGeneratedAssets];

          await upsertStep({
            runId: run.id,
            stepNumber: 4,
            stepName: "Scene generation",
            status: "succeeded",
            apiUsed: "openai",
            modelId: "gpt-image-2",
            inputAssetIds: successfulCutouts.map((item) => item.cutoutAssetId),
            outputAssetIds: generatedAssets.map((asset) => asset.assetId),
            durationMs: Date.now() - generationStarted,
            costUsd: Number(generatedAssets.reduce((sum, asset) => sum + Number(asset.costUsd ?? 0), 0).toFixed(4)),
          });
        } catch (error) {
          await upsertStep({
            runId: run.id,
            stepNumber: 4,
            stepName: "Scene generation",
            status: "failed",
            apiUsed: "openai",
            modelId: "gpt-image-2",
            inputAssetIds: successfulCutouts.map((item) => item.cutoutAssetId),
            durationMs: Date.now() - generationStarted,
            error: getErrorMessage(error),
          });
          throw error;
        }
      }
      }

      if (startAtStep <= 5) {
        unwrapTaskResult(await enhanceTask.triggerAndWait({ projectId }), "Enhance step");
      }
      if (startAtStep <= 6) {
        unwrapTaskResult(await adaptTask.triggerAndWait({ projectId }), "Adapt step");
      }
      if (startAtStep <= 7) {
        unwrapTaskResult(await qaTask.triggerAndWait({ projectId }), "QA step");
      }

      await updateRun(run.id, {
        status: "review",
        completed_at: new Date().toISOString(),
        error: null,
      });

      logger.info("Pipeline ready for review", { projectId });
      return { projectId, status: "ready_for_review" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown pipeline error";
      await updateProjectStatus(projectId, "failed");
      await updateRun(run.id, {
        status: "failed",
        error: message,
        completed_at: new Date().toISOString(),
      });
      throw error;
    }
  },
});
