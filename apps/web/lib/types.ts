export type Industry = "jewellery" | "food" | "interior" | "fashion" | "other";
export type PackType = "marketplace" | "social" | "premium" | "catalog";
export type ProjectStatus = "intake" | "running" | "review" | "delivered" | "failed";
export type AssetKind = "raw" | "cutout" | "generated" | "upscaled" | "final";
export type QaStatus = "pending" | "approved" | "rejected" | "manual_fix";
export type StepStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

export interface BrandProfile {
  id: string;
  name: string;
  industry: Industry;
  colorPalette: Array<{ hex: string; role: string }>;
  styleKeywords: string[];
  referenceImageUrls: string[];
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

