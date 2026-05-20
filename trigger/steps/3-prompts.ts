import { task } from "@trigger.dev/sdk";
import { resolvePackSlots } from "../lib/packs";
import { composeSlotPrompt } from "../lib/prompts/compose";
import { inferGenerationSize } from "../lib/prompts/index";
import { getBrandProfile, getErrorMessage, getLatestRun, getProject, upsertStep } from "../lib/state";

type IntakeItem = {
  sku: string;
  assetId: string;
  metadata: {
    productType?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
};

type CutoutItem = { sku: string; cutoutPath: string; cutoutAssetId: string };

function modelFromPreference(pref?: string) {
  switch (pref) {
    case "bria_product_shot":
      return { model: "bria-product-shot", quality: "medium" as const };
    case "bria_replace_bg":
      return { model: "bria-bg-replace", quality: "medium" as const };
    case "gpt_image_high":
      return { model: "gpt-image-2", quality: "high" as const };
    case "gpt_image_medium":
      return { model: "gpt-image-2", quality: "medium" as const };
    case "flux_pro":
      return { model: "flux-pro", quality: "high" as const };
    case "seedream":
      return { model: "seedream-4", quality: "medium" as const };
    default:
      return { model: "gpt-image-2", quality: "medium" as const };
  }
}

export const promptsTask = task({
  id: "build-prompts",
  run: async ({
    projectId,
    cutouts,
    intakeItems,
  }: {
    projectId: string;
    cutouts: CutoutItem[];
    intakeItems: IntakeItem[];
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
      const brief = (project.brief as Record<string, unknown>) ?? {};
      const targetMarketplaces = (project.target_marketplaces as string[]) ?? [];
      const variantsPerSlot = Math.max(1, Math.min(5, Number(project.variants_per_slot ?? 1)));

      const slots = resolvePackSlots(project.pack_type as string, targetMarketplaces);

      const requests = cutouts.flatMap((cutout) => {
        const intake = intakeItems.find((item) => item.sku === cutout.sku);
        const skuMeta = (brief as { skus?: Array<{ id: string }> }).skus?.find(
          (s) => s.id === cutout.sku,
        );
        const variants = skuMeta && (skuMeta as { variants?: unknown[] }).variants?.length
          ? ((skuMeta as { variants?: Array<{ color?: string; label?: string; swatchHex?: string }> })
              .variants ?? [])
          : [null];

        return slots.flatMap((slot) => {
          const isCatalogVariantSlot = slot.intent === "catalog_variant";
          // Skip catalog_variant slot when the operator hasn't supplied variants —
          // otherwise we'd spend on a duplicate of the master shot with no recolor target.
          if (isCatalogVariantSlot && (!variants.length || variants[0] == null)) return [];
          const variantList = isCatalogVariantSlot ? variants : [null];

          return variantList.flatMap((catalogVariant, vIdx) => {
            return Array.from({ length: variantsPerSlot }).map((_, variantIndex) => {
              const composed = composeSlotPrompt({
                slot,
                industry: brand?.industry ?? "other",
                brand,
                intake: intake?.metadata,
                brief: brief as Parameters<typeof composeSlotPrompt>[0]["brief"],
                sku: { id: cutout.sku },
                variantIndex: variantsPerSlot > 1 ? variantIndex : 0,
                catalogVariant: catalogVariant ?? undefined,
              });

              const routing = modelFromPreference(slot.modelPreference);
              const size = inferGenerationSize(slot.width, slot.height);
              const variantSuffix =
                variantsPerSlot > 1 ? `_v${variantIndex + 1}` : isCatalogVariantSlot ? `_var${vIdx + 1}` : "";

              return {
                projectId,
                sku: cutout.sku,
                cutoutPath: cutout.cutoutPath,
                cutoutAssetId: cutout.cutoutAssetId,
                slotId: `${slot.slot}${variantSuffix}`,
                baseSlot: slot.slot,
                prompt: composed.prompt,
                negativePrompt: composed.negativePrompt,
                model: routing.model,
                params: {
                  size,
                  quality: routing.quality,
                },
                headlineText: composed.headlineText,
                subheadText: composed.subheadText,
                ctaText: composed.ctaText,
                variantLabel: composed.variantLabel,
                catalogVariant: catalogVariant ?? null,
                carouselIndex: slot.carouselIndex ?? null,
              };
            });
          });
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

      return { projectId, slots: requests };
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
