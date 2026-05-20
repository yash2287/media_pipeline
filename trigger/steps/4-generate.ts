import sharp from "sharp";
import { logger, task } from "@trigger.dev/sdk";
import { briaProductShot, clarityUpscale, replaceBackground } from "../lib/apis/fal";
import { generateProductScene, qaImage } from "../lib/apis/openai-image";
import {
  getAsset,
  getLatestRun,
  getProject,
  getRunCostUsd,
  listReferenceAssets,
  resolveAssetUrl,
  saveAsset,
  updateAsset,
  uploadBuffer,
} from "../lib/state";

type GenerationParams = {
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  quality?: "low" | "medium" | "high";
};

type GenerationSlotPayload = {
  projectId?: string;
  sku?: string;
  cutoutPath?: string;
  cutoutAssetId?: string;
  slotId?: string;
  baseSlot?: string;
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  params?: GenerationParams;
  assetId?: string;
  rerun?: boolean;
  headlineText?: string;
  subheadText?: string;
  ctaText?: string;
  variantLabel?: string;
  carouselIndex?: number | null;
  catalogVariant?: { color?: string; label?: string; swatchHex?: string } | null;
};

type ResolvedGenerationRequest = {
  projectId: string;
  runId: string;
  sku: string;
  cutoutPath: string;
  cutoutAssetId: string;
  slotId: string;
  baseSlot: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  params: {
    size: "1024x1024" | "1536x1024" | "1024x1536";
    quality: "low" | "medium" | "high";
  };
  textOverlay: {
    headline: string;
    subhead: string;
    cta: string;
  };
  variantLabel: string;
  carouselIndex: number | null;
  catalogVariant: { color?: string; label?: string; swatchHex?: string } | null;
  rerunTargetFinalAsset:
    | {
        id: string;
        width: number | null;
        height: number | null;
        mime_type: string | null;
        metadata: Record<string, unknown> | null;
      }
    | null;
};

function inferGenerationSize(width: number | null | undefined, height: number | null | undefined) {
  if (!width || !height) {
    return "1024x1024" as const;
  }
  if (width > height) return "1536x1024" as const;
  if (height > width) return "1024x1536" as const;
  return "1024x1024" as const;
}

async function fetchBuffer(url: string, context: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function resolveGenerationRequest(slot: GenerationSlotPayload): Promise<ResolvedGenerationRequest> {
  let projectId = slot.projectId;
  if (!projectId && slot.assetId) {
    projectId = (await getAsset(slot.assetId)).project_id;
  }
  if (!projectId) {
    throw new Error("Generation task is missing the project id.");
  }

  const run = await getLatestRun(projectId);

  if (!slot.rerun) {
    if (!slot.sku || !slot.cutoutPath || !slot.cutoutAssetId || !slot.slotId || !slot.prompt) {
      throw new Error("Generation task is missing required prompt or cutout context.");
    }

    return {
      projectId,
      runId: run.id,
      sku: slot.sku,
      cutoutPath: slot.cutoutPath,
      cutoutAssetId: slot.cutoutAssetId,
      slotId: slot.slotId,
      baseSlot: slot.baseSlot ?? slot.slotId,
      prompt: slot.prompt,
      negativePrompt: slot.negativePrompt ?? "",
      model: slot.model ?? "gpt-image-2",
      params: {
        size: slot.params?.size ?? "1024x1024",
        quality: slot.params?.quality ?? "medium",
      },
      textOverlay: {
        headline: slot.headlineText ?? "",
        subhead: slot.subheadText ?? "",
        cta: slot.ctaText ?? "",
      },
      variantLabel: slot.variantLabel ?? "",
      carouselIndex: slot.carouselIndex ?? null,
      catalogVariant: slot.catalogVariant ?? null,
      rerunTargetFinalAsset: null,
    };
  }

  if (!slot.assetId) {
    throw new Error("Re-run requests must include the final asset id.");
  }

  const targetAsset = await getAsset(slot.assetId);
  const finalAsset = targetAsset.kind === "final" ? targetAsset : null;
  const upscaledAsset = finalAsset?.parent_asset_id
    ? await getAsset(finalAsset.parent_asset_id)
    : targetAsset.kind === "upscaled"
      ? targetAsset
      : null;
  const generatedAsset = upscaledAsset?.parent_asset_id
    ? await getAsset(upscaledAsset.parent_asset_id)
    : targetAsset.kind === "generated"
      ? targetAsset
      : null;

  if (!generatedAsset) {
    throw new Error(`Could not resolve generated source asset for re-run target ${slot.assetId}.`);
  }
  if (!generatedAsset.parent_asset_id) {
    throw new Error(`Generated asset ${generatedAsset.id} is missing its cutout parent reference.`);
  }

  const cutoutAsset = await getAsset(generatedAsset.parent_asset_id);
  const generatedMetadata = (generatedAsset.metadata ?? {}) as Record<string, unknown>;
  const finalMetadata = (finalAsset?.metadata ?? {}) as Record<string, unknown>;

  return {
    projectId,
    runId: run.id,
    sku: slot.sku ?? generatedAsset.sku_id,
    cutoutPath: slot.cutoutPath ?? cutoutAsset.storage_path,
    cutoutAssetId: slot.cutoutAssetId ?? cutoutAsset.id,
    slotId: slot.slotId ?? String(finalMetadata.slot ?? generatedMetadata.slot ?? "variant"),
    baseSlot: slot.baseSlot ?? String(finalMetadata.baseSlot ?? generatedMetadata.baseSlot ?? "variant"),
    prompt: slot.prompt ?? String(generatedMetadata.prompt ?? "Create a premium product image."),
    negativePrompt: slot.negativePrompt ?? String(generatedMetadata.negativePrompt ?? ""),
    model: slot.model ?? String(generatedMetadata.model ?? "gpt-image-2"),
    params: {
      size:
        slot.params?.size ??
        (generatedMetadata.size as "1024x1024" | "1536x1024" | "1024x1536" | undefined) ??
        inferGenerationSize(finalAsset?.width ?? null, finalAsset?.height ?? null),
      quality:
        slot.params?.quality ??
        (generatedMetadata.quality as "low" | "medium" | "high" | undefined) ??
        "medium",
    },
    textOverlay: {
      headline: slot.headlineText ?? String(finalMetadata.headlineText ?? generatedMetadata.headlineText ?? ""),
      subhead: slot.subheadText ?? String(finalMetadata.subheadText ?? generatedMetadata.subheadText ?? ""),
      cta: slot.ctaText ?? String(finalMetadata.ctaText ?? generatedMetadata.ctaText ?? ""),
    },
    variantLabel: slot.variantLabel ?? String(finalMetadata.variantLabel ?? ""),
    carouselIndex: slot.carouselIndex ?? (finalMetadata.carouselIndex as number | null) ?? null,
    catalogVariant: slot.catalogVariant ?? (finalMetadata.catalogVariant as Record<string, string> | null) ?? null,
    rerunTargetFinalAsset: finalAsset
      ? {
          id: finalAsset.id,
          width: finalAsset.width,
          height: finalAsset.height,
          mime_type: finalAsset.mime_type,
          metadata: (finalAsset.metadata ?? {}) as Record<string, unknown>,
        }
      : null,
  };
}

function aspectRatioFromSize(size: "1024x1024" | "1536x1024" | "1024x1536") {
  switch (size) {
    case "1536x1024":
      return "16:9";
    case "1024x1536":
      return "9:16";
    default:
      return "1:1";
  }
}

async function downgradeIfOverBudget(request: ResolvedGenerationRequest) {
  const project = await getProject(request.projectId);
  const cap = project.budget_cap_usd != null ? Number(project.budget_cap_usd) : null;
  if (!cap) return request;
  const spent = await getRunCostUsd(request.runId);
  // If we're past 70% of cap and using high quality on gpt-image-2, drop to medium.
  if (spent > cap * 0.7 && request.model === "gpt-image-2" && request.params.quality === "high") {
    return {
      ...request,
      params: { ...request.params, quality: "medium" as const },
    };
  }
  return request;
}

async function generateSceneBuffer(request: ResolvedGenerationRequest) {
  const cutoutUrl = await resolveAssetUrl(request.cutoutPath);

  if (request.model === "bria-product-shot") {
    const url = await briaProductShot({
      imageUrl: cutoutUrl,
      prompt: request.prompt,
      aspectRatio: aspectRatioFromSize(request.params.size),
    });
    return fetchBuffer(url, `Bria product shot ${request.sku}/${request.slotId}`);
  }

  if (request.model === "bria-bg-replace") {
    const url = await replaceBackground({
      imageUrl: cutoutUrl,
      prompt: request.prompt,
      aspectRatio: aspectRatioFromSize(request.params.size),
    });
    return fetchBuffer(url, `Bria bg-replace ${request.sku}/${request.slotId}`);
  }

  // Default: gpt-image-2 with optional reference images (brand logo, mood boards)
  const references: string[] = [];
  try {
    const refs = await listReferenceAssets(request.projectId);
    for (const ref of refs.slice(0, 3)) {
      const url = await resolveAssetUrl(ref.storage_path);
      references.push(url);
    }
  } catch (err) {
    logger.warn("Failed to load reference assets — proceeding without", { err });
  }

  return await generateProductScene({
    cutoutImageUrl: cutoutUrl,
    prompt: request.prompt,
    negativePrompt: request.negativePrompt,
    size: request.params.size,
    quality: request.params.quality,
    referenceImageUrls: references,
  });
}

function modelCost(model: string, quality: "low" | "medium" | "high") {
  if (model === "bria-product-shot") return 0.023;
  if (model === "bria-bg-replace") return 0.023;
  if (model === "flux-pro") return 0.05;
  if (model === "seedream-4") return 0.03;
  // gpt-image-2
  if (quality === "high") return 0.17;
  if (quality === "medium") return 0.08;
  return 0.04;
}

async function createRerunFinalAssets(opts: {
  request: ResolvedGenerationRequest;
  generatedAsset: { id: string; storage_path: string };
}) {
  const { request, generatedAsset } = opts;
  if (!request.rerunTargetFinalAsset) return null;

  const generatedUrl = await resolveAssetUrl(generatedAsset.storage_path);
  const upscaledUrl = await clarityUpscale(generatedUrl);
  const upscaledBuffer = await fetchBuffer(upscaledUrl, `Failed to fetch rerun upscale for ${request.sku}/${request.slotId}`);

  const upscaledStoragePath = `${request.projectId}/upscaled/${request.sku}_${request.slotId}_${Date.now()}.png`;
  await uploadBuffer(upscaledStoragePath, upscaledBuffer, "image/png");
  const upscaledAsset = await saveAsset({
    projectId: request.projectId,
    skuId: request.sku,
    kind: "upscaled",
    storagePath: upscaledStoragePath,
    parentAssetId: generatedAsset.id,
    mimeType: "image/png",
    metadata: {
      source: "clarity-upscaler",
      slot: request.slotId,
      baseSlot: request.baseSlot,
      runId: request.runId,
      rerunOfAssetId: request.rerunTargetFinalAsset.id,
    },
    qaStatus: "pending",
  });

  const outputMimeType = request.rerunTargetFinalAsset.mime_type === "image/png" ? "image/png" : "image/jpeg";
  const outputFormat = outputMimeType === "image/png" ? "png" : "jpeg";
  const width = request.rerunTargetFinalAsset.width ?? 2000;
  const height = request.rerunTargetFinalAsset.height ?? 2000;
  const finalBuffer = await sharp(upscaledBuffer)
    .resize(width, height, { fit: "cover" })
    .toFormat(outputFormat)
    .toBuffer();

  const ext = outputFormat === "png" ? "png" : "jpg";
  const finalStoragePath = `${request.projectId}/final/${request.sku}_${request.slotId}_${Date.now()}.${ext}`;
  await uploadBuffer(finalStoragePath, finalBuffer, outputMimeType);
  const finalAsset = await saveAsset({
    projectId: request.projectId,
    skuId: request.sku,
    kind: "final",
    storagePath: finalStoragePath,
    parentAssetId: upscaledAsset.id,
    mimeType: outputMimeType,
    width,
    height,
    metadata: {
      ...(request.rerunTargetFinalAsset.metadata ?? {}),
      slot: request.slotId,
      baseSlot: request.baseSlot,
      runId: request.runId,
      rerunOfAssetId: request.rerunTargetFinalAsset.id,
    },
    qaStatus: "pending",
  });

  const finalUrl = await resolveAssetUrl(finalStoragePath);
  const qa = await qaImage(finalUrl, request.slotId);
  await updateAsset(finalAsset.id, {
    qa_score: qa.score,
    qa_status: qa.status,
    metadata: {
      ...(finalAsset.metadata ?? {}),
      qa_notes: qa.notes,
    },
  });

  return {
    upscaledAssetId: upscaledAsset.id,
    finalAssetId: finalAsset.id,
    qaScore: qa.score,
    qaStatus: qa.status,
  };
}

export const generateSceneTask = task({
  id: "generate-scene",
  queue: { concurrencyLimit: 5 },
  run: async (slot: GenerationSlotPayload) => {
    let request = await resolveGenerationRequest(slot);
    request = await downgradeIfOverBudget(request);

    const outputBuffer = await generateSceneBuffer(request);
    if (!outputBuffer) {
      throw new Error("Image generation did not return output.");
    }

    const timestamp = Date.now();
    const storagePath = `${request.projectId}/generated/${request.sku}_${request.slotId}_${timestamp}.png`;
    await uploadBuffer(storagePath, outputBuffer, "image/png");

    const asset = await saveAsset({
      projectId: request.projectId,
      skuId: request.sku,
      kind: "generated",
      storagePath,
      parentAssetId: request.cutoutAssetId,
      mimeType: "image/png",
      metadata: {
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        slot: request.slotId,
        baseSlot: request.baseSlot,
        model: request.model,
        size: request.params.size,
        quality: request.params.quality,
        headlineText: request.textOverlay.headline,
        subheadText: request.textOverlay.subhead,
        ctaText: request.textOverlay.cta,
        variantLabel: request.variantLabel,
        carouselIndex: request.carouselIndex,
        catalogVariant: request.catalogVariant,
        runId: request.runId,
        rerun: Boolean(slot.rerun),
        rerunSourceAssetId: slot.assetId ?? null,
      },
      qaStatus: "pending",
    });

    const rerunArtifacts = await createRerunFinalAssets({ request, generatedAsset: asset });

    logger.info("Generated scene", {
      projectId: request.projectId,
      sku: request.sku,
      slotId: request.slotId,
      model: request.model,
      assetId: asset.id,
      rerun: Boolean(slot.rerun),
      finalAssetId: rerunArtifacts?.finalAssetId ?? null,
    });

    return {
      assetId: asset.id,
      sku: request.sku,
      slotId: request.slotId,
      storagePath,
      costUsd: modelCost(request.model, request.params.quality),
      rerunFinalAssetId: rerunArtifacts?.finalAssetId ?? null,
    };
  },
});
