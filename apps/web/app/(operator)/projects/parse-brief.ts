"use server";

import OpenAI from "openai";
import { env } from "@/lib/env";

const PARSE_MODEL = "gpt-4o-mini";

export type ParsedBrief = {
  // Client tab
  clientName?: string;
  clientEmail?: string;
  dueAt?: string;
  packType?: "marketplace" | "social" | "premium" | "catalog";
  targetMarketplaces?: string[];

  // Brand tab
  brand?: {
    name?: string;
    industry?: "jewellery" | "food" | "interior" | "fashion" | "other";
    styleKeywords?: string;
    brandToneKeywords?: string;
    colorPalette?: string;
    brandGuidelines?: string;
  };

  // Brief tab
  campaignName?: string;
  season?: string;
  hook?: string;
  cta?: string;
  valueProps?: string;
  targetAudience?: string;
  tone?: string;

  // Art direction
  lighting?: "studio" | "window" | "golden_hour" | "overcast" | "hard_product" | "moody" | "neon";
  scene?:
    | "marble"
    | "linen"
    | "wood"
    | "concrete"
    | "outdoor"
    | "tabletop"
    | "studio_white"
    | "studio_dark"
    | "lifestyle_room"
    | "on_model";
  framing?: "eye_level" | "top_down" | "three_quarter" | "macro" | "low_angle";
  colorGrade?: "neutral" | "warm_magazine" | "cool_tech" | "kinfolk_natural" | "high_contrast";

  // Copy tab
  carouselSlides?: number;
  carouselCopy?: string;
  variantsPerSlot?: number;

  // SKU tab
  skuTable?: string;

  // Output config
  budgetCapUsd?: number;
  smartCrop?: boolean;
  companionExports?: boolean;
  captionAutoGen?: boolean;
  watermark?: boolean;
  generateListingCsv?: boolean;

  notes?: string;
};

const enumStr = (values: string[]) => ({ type: "string" as const, enum: values });

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["fields"],
  properties: {
    fields: {
      type: "object",
      additionalProperties: false,
      required: [
        "clientName",
        "clientEmail",
        "dueAt",
        "packType",
        "targetMarketplaces",
        "brand",
        "campaignName",
        "season",
        "hook",
        "cta",
        "valueProps",
        "targetAudience",
        "tone",
        "lighting",
        "scene",
        "framing",
        "colorGrade",
        "carouselSlides",
        "carouselCopy",
        "variantsPerSlot",
        "skuTable",
        "budgetCapUsd",
        "smartCrop",
        "companionExports",
        "captionAutoGen",
        "watermark",
        "generateListingCsv",
        "notes",
      ],
      properties: {
        clientName: { type: ["string", "null"] },
        clientEmail: { type: ["string", "null"] },
        dueAt: { type: ["string", "null"], description: "ISO datetime if mentioned, else null." },
        packType: { ...enumStr(["marketplace", "social", "premium", "catalog"]), nullable: true },
        targetMarketplaces: {
          type: "array",
          items: enumStr([
            "amazon",
            "etsy",
            "shopify",
            "flipkart",
            "meesho",
            "instagram",
            "pinterest",
            "linkedin",
            "tiktok",
          ]),
        },
        brand: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "industry",
            "styleKeywords",
            "brandToneKeywords",
            "colorPalette",
            "brandGuidelines",
          ],
          properties: {
            name: { type: ["string", "null"] },
            industry: {
              ...enumStr(["jewellery", "food", "interior", "fashion", "other"]),
              nullable: true,
            },
            styleKeywords: {
              type: ["string", "null"],
              description: "Comma-separated descriptors. e.g. 'minimal, warm, artisan'.",
            },
            brandToneKeywords: { type: ["string", "null"] },
            colorPalette: {
              type: ["string", "null"],
              description:
                "Hex:role pairs comma-separated, e.g. '#111827:primary,#c084fc:accent,#f8fafc:neutral'.",
            },
            brandGuidelines: { type: ["string", "null"] },
          },
        },
        campaignName: { type: ["string", "null"] },
        season: { type: ["string", "null"] },
        hook: { type: ["string", "null"], description: "≤ 80 char headline." },
        cta: { type: ["string", "null"] },
        valueProps: {
          type: ["string", "null"],
          description: "Comma-separated value propositions.",
        },
        targetAudience: { type: ["string", "null"] },
        tone: { type: ["string", "null"], description: "Comma-separated tone descriptors." },
        lighting: {
          ...enumStr([
            "studio",
            "window",
            "golden_hour",
            "overcast",
            "hard_product",
            "moody",
            "neon",
          ]),
          nullable: true,
        },
        scene: {
          ...enumStr([
            "marble",
            "linen",
            "wood",
            "concrete",
            "outdoor",
            "tabletop",
            "studio_white",
            "studio_dark",
            "lifestyle_room",
            "on_model",
          ]),
          nullable: true,
        },
        framing: {
          ...enumStr(["eye_level", "top_down", "three_quarter", "macro", "low_angle"]),
          nullable: true,
        },
        colorGrade: {
          ...enumStr([
            "neutral",
            "warm_magazine",
            "cool_tech",
            "kinfolk_natural",
            "high_contrast",
          ]),
          nullable: true,
        },
        carouselSlides: { type: ["integer", "null"], minimum: 3, maximum: 10 },
        carouselCopy: {
          type: ["string", "null"],
          description:
            "One line per slide using format 'N|headline|subhead|cta'. Leave null if not a carousel.",
        },
        variantsPerSlot: { type: ["integer", "null"], minimum: 1, maximum: 5 },
        skuTable: {
          type: ["string", "null"],
          description:
            "One SKU per line, comma-separated: id,name,material,dimensionsCm,weightG,keyFeature,priceTier",
        },
        budgetCapUsd: { type: ["number", "null"], minimum: 0 },
        smartCrop: { type: ["boolean", "null"] },
        companionExports: { type: ["boolean", "null"] },
        captionAutoGen: { type: ["boolean", "null"] },
        watermark: { type: ["boolean", "null"] },
        generateListingCsv: { type: ["boolean", "null"] },
        notes: { type: ["string", "null"], description: "Anything that didn't map to a field." },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You are a senior creative producer parsing a one-shot client brief for a single-tenant AI product imagery pipeline.

Map the operator's spoken or written concept to the wizard fields. Be a strong opinionated interpreter:
- Infer a sensible pack type (marketplace / social / premium / catalog) even if not stated.
- Pick target marketplaces from explicit mentions or the implied channel mix.
- Infer lighting / scene / framing / colorGrade if the brief evokes a mood.
- Decide variantsPerSlot (1 fast, 3 normal, 5 if "we need lots of options"). Default 1.
- If the brief implies a social carousel, fill carouselCopy with N slide rows ('slideNum|headline|subhead|cta').
- For SKUs, only fill skuTable if the operator describes specific products with attributes. Otherwise leave null.
- Booleans: turn on captionAutoGen for social packs, companionExports + smartCrop for marketplace, watermark only if the operator wants it.
- For brand fields, only fill them if the operator gave that info.

Return null for anything not implied. Don't invent client names, emails, or budgets.`;

function nullToUndefined<T extends object>(input: T): { [K in keyof T]?: NonNullable<T[K]> } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = nullToUndefined(value as Record<string, unknown>);
      if (Object.keys(nested).length) out[key] = nested;
    } else {
      out[key] = value;
    }
  }
  return out as { [K in keyof T]?: NonNullable<T[K]> };
}

export async function parseBriefAction(input: { brief: string }): Promise<
  | { ok: true; parsed: ParsedBrief }
  | { ok: false; error: string }
> {
  const brief = input.brief?.trim();
  if (!brief) return { ok: false, error: "Brief is empty." };
  if (brief.length > 8000) return { ok: false, error: "Brief exceeds 8000 characters." };

  if (!env.openAiApiKey) {
    return { ok: false, error: "OpenAI API key is not configured." };
  }

  const openai = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await openai.responses.parse({
      model: PARSE_MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Today is ${new Date().toISOString().slice(0, 10)}. Brief:\n\n${brief}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "intake_brief",
          strict: true,
          schema,
        },
      },
    });

    const out = response.output_parsed as { fields: Record<string, unknown> } | null;
    if (!out?.fields) {
      return { ok: false, error: "OpenAI returned no parsed fields." };
    }

    const parsed = nullToUndefined(out.fields) as unknown as ParsedBrief;
    return { ok: true, parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
