import { logger, task } from "@trigger.dev/sdk";
import { enhanceTask } from "./steps/5-enhance";
import { qaTask } from "./steps/7-qa";
import { adaptTask } from "./steps/6-adapt";
import { cutoutTask } from "./steps/2-cutout";
import { generateSceneTask } from "./steps/4-generate";
import { intakeTask } from "./steps/1-intake";
import { promptsTask } from "./steps/3-prompts";
import { getErrorMessage, getLatestRun, updateProjectStatus, updateRun, upsertStep } from "./lib/state";

function unwrapTaskResult<T>(result: { ok: boolean; output?: T; error?: unknown }, label: string): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${getErrorMessage(result.error)}`);
  }

  return result.output as T;
}

export const runPipelineTask = task({
  id: "run-pipeline",
  maxDuration: 60 * 60,
  retry: {
    maxAttempts: 1,
  },
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);

    await updateRun(run.id, {
      status: "running",
      started_at: new Date().toISOString(),
    });
    await updateProjectStatus(projectId, "running");

    try {
      const intakeResult = unwrapTaskResult(
        await intakeTask.triggerAndWait({ projectId }),
        "Intake step",
      );

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
        const cutoutBatch = await cutoutTask.batchTriggerAndWait(
          intakeResult.items.map((item: { sku: string }) => ({
            payload: { projectId, sku: item.sku },
          })),
        );

        successfulCutouts = cutoutBatch.runs.map((result, index) =>
          unwrapTaskResult(result, `Cutout step for ${intakeResult.items[index]?.sku ?? "unknown sku"}`),
        );

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
        const generateBatch = await generateSceneTask.batchTriggerAndWait(
          promptResult.slots.map((slot) => ({
            payload: slot,
          })),
        );
        const generatedAssets = generateBatch.runs.map((result, index) =>
          unwrapTaskResult(result, `Generation step ${promptResult.slots[index]?.slotId ?? index + 1}`),
        );

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

      unwrapTaskResult(await enhanceTask.triggerAndWait({ projectId }), "Enhance step");
      unwrapTaskResult(await adaptTask.triggerAndWait({ projectId }), "Adapt step");
      unwrapTaskResult(await qaTask.triggerAndWait({ projectId }), "QA step");

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
