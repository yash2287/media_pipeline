// Prompt engine v2 — per-slot templates per industry, plus shared composition helpers.

import type { PackSlot } from "../packs/types";
import { fashionTemplates } from "./fashion";
import { foodTemplates } from "./food";
import { interiorTemplates } from "./interior";
import { jewelleryTemplates } from "./jewellery";

export type PromptIndustry = "jewellery" | "food" | "interior" | "fashion" | "other";

export type PromptContext = {
  product_type: string;
  primary_color: string;
  secondary_color: string;
  vibe: string;
  tone: string;
  scene: string;
  lighting: string;
  framing: string;
  color_grade: string;
  brand_name: string;
  brand_tone_keywords: string;
  hook: string;
  cta: string;
  value_props: string;
  headline_text: string;
  subhead_text: string;
  cta_text: string;
  variant_label: string;
  carousel_slide_role: string;
};

export type SlotPromptOutput = {
  prompt: string;
  negativePrompt?: string;
};

export type SlotPromptFactory = (ctx: PromptContext) => SlotPromptOutput;

export type IndustryLibrary = Record<string, SlotPromptFactory>;

export const promptLibraries: Record<PromptIndustry, IndustryLibrary> = {
  jewellery: jewelleryTemplates,
  food: foodTemplates,
  interior: interiorTemplates,
  fashion: fashionTemplates,
  other: interiorTemplates,
};

// ---------- Universal fallbacks per slot intent ----------

const FALLBACK_TEMPLATES: IndustryLibrary = {
  marketplace_main: (ctx) => ({
    prompt: `Photorealistic e-commerce product photo of ${ctx.product_type}, centered on pure white #FFFFFF background, soft contact shadow grounding the product, ${ctx.primary_color} should stay true to color, ${ctx.framing} framing, ${ctx.lighting} lighting, retail-ready composition.`,
    negativePrompt:
      "no text, no watermark, no logos other than the product's own, no people, no props, no colored background, no shadow touching frame edge",
  }),
  marketplace_gallery: (ctx) => ({
    prompt: `Catalog gallery angle of ${ctx.product_type} on clean white background, balanced ${ctx.lighting} lighting, color accurate, no distractions.`,
    negativePrompt: "no text, no props, no people, no colored background",
  }),
  marketplace_infographic: (ctx) => ({
    prompt: `Marketplace infographic image of ${ctx.product_type}. Render the headline text "${ctx.headline_text}" prominently using a clean bold sans-serif typeface. Include a subtle feature call-out arrow pointing to the product. Soft neutral background, retail-ready composition.`,
    negativePrompt: "no busy backgrounds, no extra text beyond the requested headline, no watermark",
  }),
  marketplace_lifestyle: (ctx) => ({
    prompt: `Lifestyle scene of ${ctx.product_type} in real use, ${ctx.scene} setting, ${ctx.lighting} lighting, ${ctx.color_grade} color grade, ${ctx.vibe} mood. Photoreal, premium advertising composition.`,
    negativePrompt: "no fake-looking models, no logos other than the product's own, no plain white background",
  }),
  hero_lifestyle: (ctx) => ({
    prompt: `Editorial hero image of ${ctx.product_type} as the focal subject on a ${ctx.scene} surface with ${ctx.secondary_color} accents. ${ctx.lighting} lighting, ${ctx.framing} framing, ${ctx.color_grade} grade, ${ctx.vibe} mood. Magazine-quality finish.`,
    negativePrompt: "no plain cutout, no white catalog background, no on-image text",
  }),
  social_static: (ctx) => ({
    prompt: `Social media still for ${ctx.brand_name}: ${ctx.product_type} composed as the hero on a ${ctx.scene} setting, ${ctx.lighting} lighting, ${ctx.color_grade} grade. Optimized for ${ctx.framing} framing. Tone: ${ctx.tone}.`,
    negativePrompt: "no logos other than the product's own, no busy backgrounds",
  }),
  social_story: (ctx) => ({
    prompt: `9:16 vertical story image of ${ctx.product_type} for ${ctx.brand_name}. Keep the subject within the central 60% of the frame to avoid UI overlap on top and bottom of the device. Render the headline text "${ctx.headline_text}" centered using a clean bold sans-serif typeface with a soft dark scrim behind it. ${ctx.lighting} lighting, ${ctx.color_grade} grade.`,
    negativePrompt: "no subject placed near top or bottom edges, no watermark",
  }),
  social_carousel: (ctx) => ({
    prompt: `Social carousel slide (${ctx.carousel_slide_role}) for ${ctx.brand_name}. Feature ${ctx.product_type} in a ${ctx.scene} scene. Render the headline "${ctx.headline_text}"${ctx.subhead_text ? ` and subhead "${ctx.subhead_text}"` : ""} using a clean bold sans-serif typeface. Tone: ${ctx.tone}. ${ctx.lighting} lighting, ${ctx.color_grade} grade.`,
    negativePrompt:
      "no misspelled text, no garbled characters, no logos other than the product's own, no busy clashing fonts",
  }),
  pinterest_pin: (ctx) => ({
    prompt: `Tall Pinterest pin (2:3) of ${ctx.product_type}. Render the headline "${ctx.headline_text}" using a bold serif or modern sans-serif typeface at the top with a soft dark scrim. Aspirational ${ctx.scene} setting, ${ctx.lighting} lighting, ${ctx.color_grade} grade.`,
    negativePrompt: "no misspelled text, no busy backgrounds",
  }),
  linkedin_post: (ctx) => ({
    prompt: `LinkedIn link-preview image (1.91:1) for ${ctx.brand_name}. Feature ${ctx.product_type} on the right side of the frame with a clean professional ${ctx.scene} backdrop. Render the headline "${ctx.headline_text}" on the left using a clean bold sans-serif typeface. Tone: ${ctx.tone}.`,
    negativePrompt: "no garbled text, no busy distracting backgrounds",
  }),
  catalog_angle: (ctx) => ({
    prompt: `Catalog product image of ${ctx.product_type} from ${ctx.framing} angle, on clean white background, ${ctx.lighting} lighting, color accurate, consistent framing with the rest of the catalog.`,
    negativePrompt: "no text, no props, no colored background, no inconsistent framing",
  }),
  catalog_variant: (ctx) => ({
    prompt: `Same product (${ctx.product_type}) on clean white background, recoloured to ${ctx.variant_label}. Keep all geometry, framing, lighting and shadow identical to the master catalog shot — only the color of the product itself changes.`,
    negativePrompt: "no shape changes, no new props, no different lighting, no text",
  }),
  thumbnail: (ctx) => ({
    prompt: `Thumbnail-sized catalog image of ${ctx.product_type} on pure white background.`,
    negativePrompt: "no text, no props",
  }),
};

function emptyContext(): PromptContext {
  return {
    product_type: "product",
    primary_color: "neutral",
    secondary_color: "white",
    vibe: "premium",
    tone: "premium",
    scene: "studio_white",
    lighting: "studio",
    framing: "eye_level",
    color_grade: "neutral",
    brand_name: "the brand",
    brand_tone_keywords: "premium",
    hook: "",
    cta: "",
    value_props: "",
    headline_text: "",
    subhead_text: "",
    cta_text: "",
    variant_label: "",
    carousel_slide_role: "supporting slide",
  };
}

export function buildContext(overrides: Partial<PromptContext>): PromptContext {
  return { ...emptyContext(), ...overrides };
}

export function selectPromptFactory(
  industry: PromptIndustry,
  slot: PackSlot,
): SlotPromptFactory {
  const library = promptLibraries[industry] ?? promptLibraries.other;
  const bySlot = library[slot.slot];
  if (bySlot) return bySlot;
  const byIntent = library[slot.intent];
  if (byIntent) return byIntent;
  const fallbackByIntent = FALLBACK_TEMPLATES[slot.intent];
  if (fallbackByIntent) return fallbackByIntent;
  // Legacy compatibility for old templates
  if (library.hero_lifestyle && /lifestyle|hero|story|carousel|social/i.test(slot.intent)) {
    return library.hero_lifestyle;
  }
  return library.marketplace_main ?? FALLBACK_TEMPLATES.marketplace_main;
}

export function appendVariantHint(prompt: string, variantIndex: number) {
  if (!variantIndex) return prompt;
  const hints = [
    "Variant A — primary composition",
    "Variant B — alternate camera angle, warmer light",
    "Variant C — alternate background tone, looser composition",
    "Variant D — closer crop, dramatic side light",
    "Variant E — top-down, editorial layout",
  ];
  return `${prompt}\n\n${hints[Math.min(variantIndex, hints.length - 1)]}.`;
}

export function inferGenerationSize(width: number, height: number): "1024x1024" | "1536x1024" | "1024x1536" {
  if (width > height) return "1536x1024";
  if (height > width) return "1024x1536";
  return "1024x1024";
}
