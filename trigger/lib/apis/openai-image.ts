import OpenAI from "openai";
import { triggerEnv } from "../env";

const openai = triggerEnv.openAiApiKey ? new OpenAI({ apiKey: triggerEnv.openAiApiKey }) : null;

type ProductImageAnalysis = {
  isValid: boolean;
  issues: string[];
  productType: string;
  primaryColor: string;
  secondaryColor: string;
  count: number;
  watermarkDetected: boolean;
  multipleProducts: boolean;
};

type QaResult = {
  score: number;
  status: "approved" | "manual_fix" | "rejected";
  notes: string[];
};

const productImageAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "isValid",
    "issues",
    "productType",
    "primaryColor",
    "secondaryColor",
    "count",
    "watermarkDetected",
    "multipleProducts",
  ],
  properties: {
    isValid: { type: "boolean" },
    issues: {
      type: "array",
      items: { type: "string" },
    },
    productType: { type: "string" },
    primaryColor: { type: "string" },
    secondaryColor: { type: "string" },
    count: { type: "integer", minimum: 0 },
    watermarkDetected: { type: "boolean" },
    multipleProducts: { type: "boolean" },
  },
} as const;

const qaSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "status", "notes"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    status: {
      type: "string",
      enum: ["approved", "manual_fix", "rejected"],
    },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function assertValidImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Image URL must use http or https.");
    }
  } catch {
    throw new Error(`Invalid image URL provided to OpenAI: ${imageUrl}`);
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function parseStructuredVisionResponse<T>(opts: {
  imageUrl: string;
  name: string;
  instruction: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  assertValidImageUrl(opts.imageUrl);

  if (!openai) {
    throw new Error("OpenAI client is not configured.");
  }

  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: opts.instruction,
          },
          {
            type: "input_image",
            image_url: opts.imageUrl,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: opts.name,
        schema: opts.schema,
        strict: true,
      },
    },
  });

  if (!response.output_parsed) {
    throw new Error(`OpenAI did not return structured output for ${opts.name}.`);
  }

  return response.output_parsed as T;
}

async function fetchImageAsFile(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image for generation: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new File([arrayBuffer], "cutout.png", { type: "image/png" });
}

export async function analyzeProductImage(imageUrl: string): Promise<ProductImageAnalysis> {
  assertValidImageUrl(imageUrl);

  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return parseStructuredVisionResponse<ProductImageAnalysis>({
    imageUrl,
    name: "product_image_analysis",
    instruction:
      "Inspect this product source photo for an internal product imaging pipeline. Validate subject clarity, count, watermarks, and product attributes for prompt construction.",
    schema: productImageAnalysisSchema,
  });
}

async function urlToFile(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch reference image (${name}): ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return new File([buffer], name, { type: "image/png" });
}

export async function generateProductScene(opts: {
  cutoutImageUrl: string;
  prompt: string;
  negativePrompt?: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
  quality: "low" | "medium" | "high";
  referenceImageUrls?: string[]; // up to 3 additional references (logo, mood, competitor)
}) {
  assertValidImageUrl(opts.cutoutImageUrl);

  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const primary = await fetchImageAsFile(opts.cutoutImageUrl);

  // gpt-image-2 edits accept an array of images. The first is the primary subject;
  // subsequent images act as style/brand/mood references.
  const refs: File[] = [];
  for (const [i, refUrl] of (opts.referenceImageUrls ?? []).slice(0, 3).entries()) {
    try {
      assertValidImageUrl(refUrl);
      refs.push(await urlToFile(refUrl, `reference_${i + 1}.png`));
    } catch (err) {
      // soft-fail on references
      console.warn("Skipping invalid reference image", refUrl, err);
    }
  }

  const finalPrompt = opts.negativePrompt
    ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}.`
    : opts.prompt;

  const response = (await openai.images.edit({
    model: "gpt-image-2",
    image: refs.length > 0 ? [primary, ...refs] : primary,
    prompt: finalPrompt,
    size: opts.size,
    quality: opts.quality,
    output_format: "png",
  } as unknown as Parameters<typeof openai.images.edit>[0])) as unknown as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image edit did not return base64 image data.");
  }

  return Buffer.from(b64, "base64");
}

// Caption + hashtag generator (separate, cheap call). Used by delivery step.
export async function generateSocialCaption(opts: {
  brandName: string;
  productType: string;
  tone: string;
  hook: string;
  cta: string;
  marketplace: string;
}) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Write an organic ${opts.marketplace} caption for ${opts.brandName} promoting a ${opts.productType}.\nHook: ${opts.hook || "(none provided)"}.\nCTA: ${opts.cta || "Shop now"}.\nTone keywords: ${opts.tone || "premium"}.\n\nReturn JSON with: caption (string, 80-220 chars), hashtags (array of 8-15 lowercase #hashtags), alt_text (≤125 chars).`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "social_caption",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["caption", "hashtags", "alt_text"],
          properties: {
            caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            alt_text: { type: "string" },
          },
        },
      },
    },
  });

  const data = response.output_parsed as {
    caption: string;
    hashtags: string[];
    alt_text: string;
  } | null;
  if (!data) {
    throw new Error("OpenAI caption generation returned no parsed output.");
  }
  return data;
}

export async function qaImage(imageUrl: string, promptHint: string): Promise<QaResult> {
  assertValidImageUrl(imageUrl);

  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const parsed = await parseStructuredVisionResponse<QaResult>({
    imageUrl,
    name: "product_image_qa",
    instruction: `Rate this output image for product QA on a 0-100 scale. Consider artifacts, product distortion, color drift, and marketplace readiness. Context: ${promptHint}.`,
    schema: qaSchema,
  });

  const score = clampScore(parsed.score);
  return {
    score,
    status: score >= 85 ? "approved" : score >= 70 ? "manual_fix" : "rejected",
    notes: Array.isArray(parsed.notes) ? parsed.notes : [],
  };
}
