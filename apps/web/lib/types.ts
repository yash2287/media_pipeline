export type Industry = "jewellery" | "food" | "interior" | "fashion" | "other";
export type PackType = "marketplace" | "social" | "premium" | "catalog";
export type ProjectStatus = "intake" | "running" | "review" | "delivered" | "failed";
export type AssetKind =
  | "raw"
  | "cutout"
  | "generated"
  | "upscaled"
  | "final"
  | "reference"
  | "companion";
export type QaStatus = "pending" | "approved" | "rejected" | "manual_fix";
export type StepStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";
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

export type LightingPreset =
  | "studio"
  | "window"
  | "golden_hour"
  | "overcast"
  | "hard_product"
  | "moody"
  | "neon";

export type SceneSurface =
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

export type CameraFraming = "eye_level" | "top_down" | "three_quarter" | "macro" | "low_angle";

export type ColorGrade =
  | "neutral"
  | "warm_magazine"
  | "cool_tech"
  | "kinfolk_natural"
  | "high_contrast";

export interface RenderTextSpec {
  headline?: string;
  subhead?: string;
  cta?: string;
  font?: string;
  color?: string;
  placement?: "top_center" | "bottom_center" | "left" | "right" | "center";
  background?: "transparent" | "scrim_dark" | "scrim_light" | "pill_accent";
  sizeScale?: number;
}

export interface SkuMeta {
  id: string;
  name?: string;
  material?: string;
  dimensionsCm?: string;
  weightG?: number;
  keyFeature?: string;
  priceTier?: string;
  variants?: Array<{ color?: string; swatchHex?: string; label?: string }>;
}

export interface ProjectBrief {
  campaignName?: string;
  hook?: string;
  valueProps?: string[];
  cta?: string;
  targetAudience?: string;
  tone?: string[];
  season?: string;
  launchDate?: string | null;

  // Art direction
  lighting?: LightingPreset;
  scene?: SceneSurface;
  framing?: CameraFraming;
  colorGrade?: ColorGrade;
  moodReferenceIds?: string[];
  styleAnchorAssetId?: string | null;

  // Carousel (social)
  carouselSlides?: number;
  carouselCopy?: Array<{
    slide: number;
    headline?: string;
    subhead?: string;
    cta?: string;
  }>;

  // Per-slot text overrides (key by slot id)
  slotText?: Record<string, RenderTextSpec>;

  // Output config
  formats?: Array<"jpeg" | "png" | "webp" | "avif">;
  watermark?: boolean;
  captionAutoGen?: boolean;
  companionExports?: boolean;
  smartCrop?: boolean;
  generateListingCsv?: boolean;

  // Per-SKU
  skus?: SkuMeta[];
}

export interface BrandProfile {
  id: string;
  name: string;
  industry: Industry;
  colorPalette: Array<{ hex: string; role: string }>;
  styleKeywords: string[];
  toneKeywords: string[];
  referenceImageUrls: string[];
  logoStoragePath: string | null;
  fontFamily: string | null;
  watermarkEnabled: boolean;
  brandGuidelinesMd: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  brandProfileId: string | null;
  clientName: string;
  clientEmail: string | null;
  packType: PackType;
  status: ProjectStatus;
  dueAt: string | null;
  deliveryUrl: string | null;
  totalCostUsd: number;
  createdAt: string;
  brief: ProjectBrief;
  targetMarketplaces: Marketplace[];
  variantsPerSlot: number;
  budgetCapUsd: number | null;
}

export interface Asset {
  id: string;
  projectId: string;
  skuId: string;
  kind: AssetKind;
  parentAssetId: string | null;
  storagePath: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  metadata: Record<string, unknown>;
  qaScore: number | null;
  qaStatus: QaStatus;
  createdAt: string;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  triggerRunId: string | null;
  status: "queued" | "running" | "review" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  totalCostUsd: number;
}

export interface PipelineStep {
  id: string;
  runId: string;
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  apiUsed: string | null;
  modelId: string | null;
  durationMs: number | null;
  costUsd: number;
  error: string | null;
  attempt: number;
}

export interface PromptTemplate {
  id: string;
  industry: Industry;
  slot: string;
  promptTemplate: string;
  modelId: string;
  defaultParams: Record<string, unknown>;
  isActive: boolean;
}

export interface ProjectDetail {
  project: Project;
  brandProfile: BrandProfile | null;
  run: PipelineRun | null;
  steps: PipelineStep[];
  assets: Asset[];
}
