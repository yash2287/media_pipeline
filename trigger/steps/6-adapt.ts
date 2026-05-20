import sharp from "sharp";
import { logger, task } from "@trigger.dev/sdk";
import { resolvePackSlots } from "../lib/packs";
import type { PackSlot } from "../lib/packs/types";
import { dumbCrop, fitWithSafeZone, shouldUseSafeZone, smartCrop } from "../lib/imaging/crop";
import { compositeTextOverlay, compositeWatermark } from "../lib/imaging/text-overlay";
import {
  getBrandProfile,
  getErrorMessage,
  getLatestRun,
  getProject,
  listRunAssets,
  resolveAssetUrl,
  saveAsset,
  upsertStep,
  uploadBuffer,
} from "../lib/state";

async function fetchBuffer(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function pickFinalFormat(slot: PackSlot) {
  if (slot.format === "png") return { format: "png" as const, mime: "image/png" };
  if (slot.format === "webp") return { format: "webp" as const, mime: "image/webp" };
  return { format: "jpeg" as const, mime: "image/jpeg" };
}

function metadataTextSpec(asset: { metadata?: Record<string, unknown> | null }) {
  const m = asset.metadata ?? {};
  return {
    headline: String((m.headlineText as string | undefined) ?? ""),
    subhead: String((m.subheadText as string | undefined) ?? ""),
    cta: String((m.ctaText as string | undefined) ?? ""),
  };
}

export const adaptTask = task({
  id: "adapt-formats",
  run: async ({ projectId }: { projectId: string }) => {
    const run = await getLatestRun(projectId);
    const started = Date.now();
    await upsertStep({
      runId: run.id,
      stepNumber: 6,
      stepName: "Multi-format adaptation",
      status: "running",
      apiUsed: "sharp",
    });

    try {
      const project = await getProject(projectId);
      const brand = await getBrandProfile(project.brand_profile_id ?? null);
      const brief = (project.brief as Record<string, unknown>) ?? {};
      const targetMarketplaces = (project.target_marketplaces as string[]) ?? [];
      const allSlots = resolvePackSlots(project.pack_type as string, targetMarketplaces);
      const slotsBySlotId = new Map(allSlots.map((s) => [s.slot, s]));
      const sourceAssets = await listRunAssets(projectId, "upscaled", run.id);
      const existingFinalAssets = await listRunAssets(projectId, "final", run.id);
      const existingFinalParentIds = new Set(
        existingFinalAssets
          .map((asset) => asset.parent_asset_id)
          .filter((assetId): assetId is string => Boolean(assetId)),
      );

      if (sourceAssets.length === 0) {
        throw new Error("No upscaled assets found for the current run.");
      }

      const watermark = Boolean(
        (brief as { watermark?: boolean }).watermark ?? brand?.watermark_enabled ?? false,
      );
      const smartCropEnabled = (brief as { smartCrop?: boolean }).smartCrop ?? true;
      const companionExports = Boolean((brief as { companionExports?: boolean }).companionExports);

      const created = [];

      for (const asset of sourceAssets) {
        if (existingFinalParentIds.has(asset.id)) {
          continue;
        }

        const baseSlotId = String(asset.metadata?.baseSlot ?? asset.metadata?.slot ?? "");
        const slot = slotsBySlotId.get(baseSlotId);
        if (!slot) {
          logger.warn("No pack spec for slot — falling back to passthrough", {
            slot: baseSlotId,
            assetId: asset.id,
          });
        }

        const targetWidth = slot?.width ?? asset.width ?? 2000;
        const targetHeight = slot?.height ?? asset.height ?? 2000;
        const targetFormat = slot ? pickFinalFormat(slot) : { format: "jpeg" as const, mime: "image/jpeg" };
        const slotKey = String(asset.metadata?.slot ?? baseSlotId);

        const url = await resolveAssetUrl(asset.storage_path);
        const buffer = await fetchBuffer(url, `Failed to fetch upscaled asset ${asset.id}`);

        let composed: Buffer;
        if (slot && shouldUseSafeZone(slot)) {
          composed = await fitWithSafeZone({
            input: buffer,
            width: targetWidth,
            height: targetHeight,
            topPx: slot.safeZone?.topPx ?? 0,
            bottomPx: slot.safeZone?.bottomPx ?? 0,
          });
        } else if (smartCropEnabled) {
          composed = await smartCrop(buffer, targetWidth, targetHeight);
        } else {
          composed = await dumbCrop(buffer, targetWidth, targetHeight);
        }

        // Text overlay (deterministic SVG) only when slot allows text + provides defaults/overrides
        const text = metadataTextSpec(asset);
        const slotAllowsText =
          slot && !slot.prohibitOnImageText && (slot.textOverlay || text.headline || text.subhead || text.cta);
        if (slotAllowsText) {
          const placement = slot?.textOverlay?.placement ?? "bottom_center";
          const background = slot?.textOverlay?.background ?? "scrim_dark";
          const accent = brand?.color_palette?.[0]?.hex ?? "#4338ca";

          composed = await compositeTextOverlay(composed, {
            width: targetWidth,
            height: targetHeight,
            headline: text.headline,
            subhead: text.subhead,
            cta: text.cta,
            placement,
            background,
            accentColor: accent,
            fontFamily: brand?.font_family ?? undefined,
          });
        }

        // Watermark (skip on slots that prohibit it like Amazon main)
        if (watermark && slot?.watermarkAllowed !== false && !slot?.prohibitOnImageText) {
          composed = await compositeWatermark({
            input: composed,
            width: targetWidth,
            height: targetHeight,
            text: brand?.name ?? "Tinkerbrains",
          });
        }

        const output = await sharp(composed)
          .toFormat(targetFormat.format)
          .toBuffer();

        const ext = targetFormat.format === "png" ? "png" : targetFormat.format === "webp" ? "webp" : "jpg";
        const storagePath = `${projectId}/final/${asset.sku_id}_${slotKey}_${asset.id}.${ext}`;
        await uploadBuffer(storagePath, output, targetFormat.mime);

        const finalAsset = await saveAsset({
          projectId,
          skuId: asset.sku_id,
          kind: "final",
          storagePath,
          parentAssetId: asset.id,
          mimeType: targetFormat.mime,
          width: targetWidth,
          height: targetHeight,
          metadata: {
            ...(asset.metadata ?? {}),
            slot: slotKey,
            baseSlot: baseSlotId,
            pack: project.pack_type,
            marketplace: slot?.marketplace ?? "any",
            intent: slot?.intent ?? null,
            requirePureWhiteBg: slot?.requirePureWhiteBg ?? false,
            minFillRatio: slot?.minFillRatio ?? null,
            renderTextApplied: slotAllowsText ? text : null,
            watermarkApplied: watermark && slot?.watermarkAllowed !== false,
            runId: run.id,
          },
          qaStatus: "pending",
        });

        created.push(finalAsset);

        // Companion exports — webp + avif, for marketplace/social slots
        if (companionExports && (targetFormat.format === "jpeg" || targetFormat.format === "png")) {
          for (const altFormat of ["webp", "avif"] as const) {
            try {
              const altBuffer = await sharp(composed).toFormat(altFormat).toBuffer();
              const altExt = altFormat;
              const altPath = `${projectId}/companion/${asset.sku_id}_${slotKey}_${asset.id}.${altExt}`;
              const altMime = altFormat === "webp" ? "image/webp" : "image/avif";
              await uploadBuffer(altPath, altBuffer, altMime);
              await saveAsset({
                projectId,
                skuId: asset.sku_id,
                kind: "companion",
                storagePath: altPath,
                parentAssetId: finalAsset.id,
                mimeType: altMime,
                width: targetWidth,
                height: targetHeight,
                metadata: {
                  ...(finalAsset.metadata ?? {}),
                  companionFormat: altFormat,
                  runId: run.id,
                },
                qaStatus: "pending",
              });
            } catch (err) {
              logger.warn(`Companion export ${altFormat} failed`, { err });
            }
          }
        }
      }

      await upsertStep({
        runId: run.id,
        stepNumber: 6,
        stepName: "Multi-format adaptation",
        status: "succeeded",
        apiUsed: "sharp",
        inputAssetIds: sourceAssets.map((asset) => asset.id),
        outputAssetIds: [...existingFinalAssets, ...created].map((asset) => asset.id),
        durationMs: Date.now() - started,
        costUsd: 0,
      });

      return { projectId, count: existingFinalAssets.length + created.length };
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
