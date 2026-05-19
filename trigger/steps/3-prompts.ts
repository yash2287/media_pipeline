import { task } from "@trigger.dev/sdk";
import { packSpecs } from "../lib/packs";
import { promptLibraries } from "../lib/prompts";
import { getBrandProfile, getErrorMessage, getLatestRun, getProject, upsertStep } from "../lib/state";

function isCreativeSlot(slot: string) {
  return (
    slot.includes("hero") ||
    slot.includes("instagram") ||
    slot.includes("story") ||
    slot.includes("social") ||
    slot.includes("lifestyle")
  );
}

export const promptsTask = task({
  id: "build-prompts",
  run: async ({
    projectId,
    cutouts,
    intakeItems,
  }: {
    projectId: string;
    cutouts: Array<{ sku: string; cutoutPath: string; cutoutAssetId: string }>;
    intakeItems: Array<{
      sku: string;
      assetId: string;
      metadata: {
        productType?: string;
        primaryColor?: string;
        secondaryColor?: string;
      };
    }>;
  }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({ runId: run.id, stepNumber: 3, stepName: "Prompt engine", status: "running" });

    try {
      if (cutouts.length === 0) {
        throw new Error("No cutout assets available for prompt generation.");
      }

      const project = await getProject(projectId);
      const brand = await getBrandProfile(project.brand_profile_id ?? null);
      const library = promptLibraries[(brand?.industry as keyof typeof promptLibraries) ?? "other"];
      const pack = packSpecs[(project.pack_type as keyof typeof packSpecs) ?? "marketplace"];

      const slots = cutouts.flatMap((cutout) => {
        const intake = intakeItems.find((item) => item.sku === cutout.sku)?.metadata;
        const baseContext = {
          product_type: intake?.productType ?? "product",
          primary_color: intake?.primaryColor ?? brand?.color_palette?.[0]?.hex ?? "neutral",
          secondary_color: intake?.secondaryColor ?? brand?.color_palette?.[1]?.hex ?? "white",
          vibe: brand?.style_keywords?.[0] ?? "premium",
        };

        return pack.map((spec) => {
          const creativeSlot = isCreativeSlot(spec.slot);
          const promptFactory = creativeSlot ? library.hero_lifestyle : library.marketplace_main;
          const size: "1024x1024" | "1536x1024" | "1024x1536" =
            spec.width > spec.height ? "1536x1024" : spec.height > spec.width ? "1024x1536" : "1024x1024";
          const quality: "medium" | "high" = creativeSlot ? "high" : "medium";

          return {
            projectId,
            sku: cutout.sku,
            cutoutPath: cutout.cutoutPath,
            cutoutAssetId: cutout.cutoutAssetId,
            slotId: spec.slot,
            prompt: promptFactory(baseContext),
            model: "gpt-image-2",
            params: {
              size,
              quality,
            },
          };
        });
      });

      await upsertStep({
        runId: run.id,
        stepNumber: 3,
        stepName: "Prompt engine",
        status: "succeeded",
        inputAssetIds: cutouts.map((cutout) => cutout.cutoutAssetId),
        durationMs: Date.now() - started,
        costUsd: 0,
      });

      return { projectId, slots };
    } catch (error) {
      await upsertStep({
        runId: run.id,
        stepNumber: 3,
        stepName: "Prompt engine",
        status: "failed",
        durationMs: Date.now() - started,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});
