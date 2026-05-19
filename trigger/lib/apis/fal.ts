import { fal } from "@fal-ai/client";
import { triggerEnv } from "../env";

if (triggerEnv.falKey) {
  fal.config({ credentials: triggerEnv.falKey });
}

export async function removeBackground(imageUrl: string) {
  if (!triggerEnv.falKey) {
    throw new Error("FAL_KEY is not configured.");
  }

  const result = await fal.subscribe("fal-ai/bria/background/remove", {
    input: { image_url: imageUrl },
    logs: false,
  });

  const url = result.data?.image?.url;
  if (!url) {
    throw new Error("fal.ai background removal did not return an image URL.");
  }

  return url;
}

export async function replaceBackground(opts: { imageUrl: string; prompt: string; aspectRatio?: string }) {
  if (!triggerEnv.falKey) {
    throw new Error("FAL_KEY is not configured.");
  }

  const result = await fal.subscribe("fal-ai/bria/background/replace", {
    input: {
      image_url: opts.imageUrl,
      prompt: opts.prompt,
      aspect_ratio: opts.aspectRatio ?? "1:1",
      refine_prompt: true,
      num_images: 1,
      fast: false,
    } as any,
  });

  const url = result.data?.images?.[0]?.url;
  if (!url) {
    throw new Error("fal.ai background replacement did not return an image URL.");
  }

  return url;
}

export async function clarityUpscale(imageUrl: string) {
  if (!triggerEnv.falKey) {
    throw new Error("FAL_KEY is not configured.");
  }

  const result = await fal.subscribe("fal-ai/clarity-upscaler", {
    input: {
      image_url: imageUrl,
      scale: 2,
    } as any,
  });

  const url = result.data?.image?.url;
  if (!url) {
    throw new Error("fal.ai clarity upscaler did not return an image URL.");
  }

  return url;
}
