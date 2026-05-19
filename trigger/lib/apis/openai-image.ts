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

export async function generateProductScene(opts: {
  cutoutImageUrl: string;
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
  quality: "low" | "medium" | "high";
}) {
  assertValidImageUrl(opts.cutoutImageUrl);

  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const file = await fetchImageAsFile(opts.cutoutImageUrl);
  const response = await openai.images.edit({
    model: "gpt-image-2",
    image: file,
    prompt: opts.prompt,
    size: opts.size,
    quality: opts.quality,
    output_format: "png",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image edit did not return base64 image data.");
  }

  return Buffer.from(b64, "base64");
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
