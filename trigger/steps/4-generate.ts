import sharp from "sharp";
import { logger, task } from "@trigger.dev/sdk";
import { replaceBackground, clarityUpscale } from "../lib/apis/fal";
import { generateProductScene, qaImage } from "../lib/apis/openai-image";
import { getAsset, getLatestRun, resolveAssetUrl, saveAsset, updateAsset, uploadBuffer } from "../lib/state";

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
  prompt?: string;
  model?: string;
  params?: GenerationParams;
  assetId?: string;
  rerun?: boolean;
};

type ResolvedGenerationRequest = {
  projectId: string;
  runId: string;
  sku: string;
  cutoutPath: string;
  cutoutAssetId: string;
  slotId: string;
  prompt: string;
  model: string;
  params: {
    size: "1024x1024" | "1536x1024" | "1024x1536";
    quality: "low" | "medium" | "high";
  };
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
      prompt: slot.prompt,
      model: slot.model ?? "gpt-image-2",
      params: {
        size: slot.params?.size ?? "1024x1024",
        quality: slot.params?.quality ?? "medium",
      },
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
    prompt: slot.prompt ?? String(generatedMetadata.prompt ?? "Create a premium product image."),
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

async function generateSceneBuffer(request: ResolvedGenerationRequest) {
  const cutoutUrl = await resolveAssetUrl(request.cutoutPath);

  if (request.model.startsWith("gpt")) {
    return await generateProductScene({
      cutoutImageUrl: cutoutUrl,
      prompt: request.prompt,
      size: request.params.size,
      quality: request.params.quality,
    });
  }

  const generatedUrl = await replaceBackground({
    imageUrl: cutoutUrl,
    prompt: request.prompt,
  });
  return fetchBuffer(generatedUrl, `Failed to fetch generated fallback image for ${request.sku}/${request.slotId}`);
}

async function createRerunFinalAssets(opts: {
  request: ResolvedGenerationRequest;
  generatedAsset: { id: string; storage_path: string };
}) {
  const { request, generatedAsset } = opts;

  if (!request.rerunTargetFinalAsset) {
    return null;
  }

  const generatedUrl = await resolveAssetUrl(opts.generatedAsset.storage_path);
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
  queue: {
    concurrencyLimit: 5,
  },
  run: async (slot: GenerationSlotPayload) => {
    const request = await resolveGenerationRequest(slot);
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
        slot: request.slotId,
        model: request.model,
        size: request.params.size,
        quality: request.params.quality,
        runId: request.runId,
        rerun: Boolean(slot.rerun),
        rerunSourceAssetId: slot.assetId ?? null,
      },
      qaStatus: "pending",
    });

    const rerunArtifacts = await createRerunFinalAssets({
      request,
      generatedAsset: asset,
    });

    logger.info("Generated scene", {
      projectId: request.projectId,
      sku: request.sku,
      slotId: request.slotId,
      assetId: asset.id,
      rerun: Boolean(slot.rerun),
      finalAssetId: rerunArtifacts?.finalAssetId ?? null,
    });

    return {
      assetId: asset.id,
      sku: request.sku,
      slotId: request.slotId,
      storagePath,
      costUsd: request.params.quality === "high" ? 0.17 : 0.08,
      rerunFinalAssetId: rerunArtifacts?.finalAssetId ?? null,
    };
  },
});
