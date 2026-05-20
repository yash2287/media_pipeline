// Compose final prompts for each slot+variant using project brief + brand profile.

import type { PackSlot } from "../packs/types";
import {
  appendVariantHint,
  buildContext,
  selectPromptFactory,
  type PromptIndustry,
} from "./index";

type BrandLike = {
  name?: string | null;
  industry?: string | null;
  color_palette?: Array<{ hex?: string; role?: string }> | null;
  style_keywords?: string[] | null;
  tone_keywords?: string[] | null;
  brand_guidelines_md?: string | null;
};

type IntakeMetaLike = {
  productType?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

type BriefLike = {
  hook?: string;
  cta?: string;
  valueProps?: string[];
  tone?: string[];
  lighting?: string;
  scene?: string;
  framing?: string;
  colorGrade?: string;
  carouselCopy?: Array<{ slide: number; headline?: string; subhead?: string; cta?: string }>;
  slotText?: Record<string, { headline?: string; subhead?: string; cta?: string }>;
  skus?: Array<{
    id: string;
    name?: string;
    keyFeature?: string;
    variants?: Array<{ color?: string; label?: string; swatchHex?: string }>;
  }>;
};

const slideRoleByIndex: Record<number, string> = {
  1: "cover hook",
  2: "promise expansion",
  3: "benefit highlight",
  4: "social proof",
  5: "call-to-action close",
  6: "secondary benefit",
  7: "feature deep-dive",
  8: "testimonial",
  9: "comparison",
  10: "final CTA",
};

export type ComposedPrompt = {
  prompt: string;
  negativePrompt: string;
  headlineText: string;
  subheadText: string;
  ctaText: string;
  carouselIndex: number | null;
  variantLabel: string;
};

export function composeSlotPrompt(opts: {
  slot: PackSlot;
  industry: string | null | undefined;
  brand: BrandLike | null | undefined;
  intake: IntakeMetaLike | null | undefined;
  brief: BriefLike | null | undefined;
  sku: { id: string; meta?: ReturnType<typeof Object> } | null;
  variantIndex?: number;
  catalogVariant?: { color?: string; label?: string; swatchHex?: string };
}): ComposedPrompt {
  const industry = ((opts.industry as PromptIndustry) ?? "other") as PromptIndustry;
  const factory = selectPromptFactory(industry, opts.slot);

  const brand = opts.brand ?? null;
  const palette = brand?.color_palette ?? [];
  const skuMeta = opts.brief?.skus?.find((s) => s.id === opts.sku?.id);

  // Resolve text overlay for this slot
  const slotTextSpec = opts.brief?.slotText?.[opts.slot.slot];
  const carouselCopy =
    opts.slot.carouselIndex != null
      ? opts.brief?.carouselCopy?.find((c) => c.slide === opts.slot.carouselIndex)
      : undefined;
  const headlineText =
    slotTextSpec?.headline ??
    carouselCopy?.headline ??
    opts.slot.textOverlay?.defaultHeadline ??
    opts.brief?.hook ??
    "";
  const subheadText =
    slotTextSpec?.subhead ??
    carouselCopy?.subhead ??
    opts.slot.textOverlay?.defaultSubhead ??
    "";
  const ctaText =
    slotTextSpec?.cta ??
    carouselCopy?.cta ??
    opts.slot.textOverlay?.defaultCta ??
    opts.brief?.cta ??
    "";

  const variantLabel = opts.catalogVariant?.label
    ?? (opts.catalogVariant?.color ?? "");

  const ctx = buildContext({
    product_type: opts.intake?.productType ?? skuMeta?.name ?? "product",
    primary_color: opts.intake?.primaryColor ?? palette?.[0]?.hex ?? "neutral",
    secondary_color: opts.intake?.secondaryColor ?? palette?.[1]?.hex ?? "white",
    vibe: brand?.style_keywords?.[0] ?? opts.brief?.tone?.[0] ?? "premium",
    tone: (opts.brief?.tone ?? brand?.tone_keywords ?? ["premium"]).join(", "),
    scene: opts.brief?.scene ?? "studio_white",
    lighting: opts.brief?.lighting ?? "studio",
    framing: opts.brief?.framing ?? "eye_level",
    color_grade: opts.brief?.colorGrade ?? "neutral",
    brand_name: brand?.name ?? "the brand",
    brand_tone_keywords: (brand?.tone_keywords ?? brand?.style_keywords ?? []).join(", "),
    hook: opts.brief?.hook ?? "",
    cta: opts.brief?.cta ?? "",
    value_props: (opts.brief?.valueProps ?? []).join("; "),
    headline_text: headlineText,
    subhead_text: subheadText,
    cta_text: ctaText,
    variant_label: variantLabel,
    carousel_slide_role:
      opts.slot.carouselIndex != null
        ? slideRoleByIndex[opts.slot.carouselIndex] ?? "supporting slide"
        : "supporting slide",
  });

  const base = factory(ctx);

  // Append brand guidance + value props as soft constraints
  const enriched = [
    base.prompt,
    opts.brief?.valueProps?.length
      ? `Key value props to honor visually (without spelling them out): ${ctx.value_props}.`
      : null,
    brand?.brand_guidelines_md
      ? `Brand guidance: ${brand.brand_guidelines_md.slice(0, 280)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const promptWithVariant = appendVariantHint(enriched, opts.variantIndex ?? 0);

  return {
    prompt: promptWithVariant,
    negativePrompt: base.negativePrompt ?? "",
    headlineText,
    subheadText,
    ctaText,
    carouselIndex: opts.slot.carouselIndex ?? null,
    variantLabel,
  };
}
