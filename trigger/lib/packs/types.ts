// Shared types for pack v2 — per-slot specs with platform metadata.

export type Marketplace =
  | "amazon"
  | "etsy"
  | "shopify"
  | "flipkart"
  | "meesho"
  | "instagram"
  | "pinterest"
  | "linkedin"
  | "tiktok";

export type SlotIntent =
  | "marketplace_main"      // white BG, ≥85% fill, no text
  | "marketplace_gallery"   // angle / detail / scale shots
  | "marketplace_infographic" // text + diagram
  | "marketplace_lifestyle"
  | "hero_lifestyle"         // premium editorial
  | "social_static"          // single social post (square / portrait)
  | "social_story"           // 9:16 with safe zones
  | "social_carousel"        // multi-slide with copy
  | "pinterest_pin"
  | "linkedin_post"
  | "catalog_angle"
  | "catalog_variant"
  | "thumbnail";

export type SlotFormat = "jpeg" | "png" | "webp";

export interface SafeZone {
  topPx?: number;
  bottomPx?: number;
  leftPx?: number;
  rightPx?: number;
}

export interface RenderTextDefault {
  defaultHeadline?: string;
  defaultSubhead?: string;
  defaultCta?: string;
  placement?: "top_center" | "bottom_center" | "left" | "right" | "center";
  background?: "transparent" | "scrim_dark" | "scrim_light" | "pill_accent";
  // "model" (default) means gpt-image-2 renders text inside the generated image
  // via prompt instructions. "svg" forces a deterministic post-process overlay
  // (use for exact legal/pricing copy where character drift is unacceptable).
  renderMode?: "model" | "svg";
}

export interface PackSlot {
  slot: string;
  intent: SlotIntent;
  width: number;
  height: number;
  format: SlotFormat;
  marketplace?: Marketplace | "any";

  // Pipeline routing
  modelPreference?:
    | "bria_product_shot"     // marketplace main, cheap + deterministic
    | "bria_replace_bg"        // background replacement keeping product
    | "gpt_image_high"
    | "gpt_image_medium"
    | "flux_pro"
    | "seedream";
  upscaleNeeded?: boolean;
  carouselIndex?: number;       // 1-based slide number when intent=social_carousel

  // QA rules
  requirePureWhiteBg?: boolean;
  minFillRatio?: number;        // 0-1 (e.g. 0.85 for Amazon main)
  prohibitOnImageText?: boolean;
  textOverlay?: RenderTextDefault | null;
  watermarkAllowed?: boolean;
  safeZone?: SafeZone;

  description?: string;
}

export interface ResolvedPackSlot extends PackSlot {
  // Filled by the prompt engine + project brief
  variantIndex?: number;        // 0-based when generating multiple variants
}
