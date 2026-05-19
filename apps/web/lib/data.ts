import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Asset, BrandProfile, PipelineRun, PipelineStep, Project, ProjectDetail, PromptTemplate } from "@/lib/types";

function mapBrandProfile(row: Record<string, unknown>): BrandProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    industry: row.industry as BrandProfile["industry"],
    colorPalette: (row.color_palette as BrandProfile["colorPalette"]) ?? [],
    styleKeywords: (row.style_keywords as string[]) ?? [],
    referenceImageUrls: (row.reference_image_urls as string[]) ?? [],
    brandGuidelinesMd: (row.brand_guidelines_md as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    brandProfileId: (row.brand_profile_id as string | null) ?? null,
    clientName: String(row.client_name),
    clientEmail: (row.client_email as string | null) ?? null,
    packType: row.pack_type as Project["packType"],
    status: row.status as Project["status"],
    dueAt: (row.due_at as string | null) ?? null,
    deliveryUrl: (row.delivery_url as string | null) ?? null,
    totalCostUsd: Number(row.total_cost_usd ?? 0),
    createdAt: String(row.created_at),
  };
}

function mapAsset(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    skuId: String(row.sku_id),
    kind: row.kind as Asset["kind"],
    parentAssetId: (row.parent_asset_id as string | null) ?? null,
    storagePath: String(row.storage_path),
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    qaScore: (row.qa_score as number | null) ?? null,
    qaStatus: row.qa_status as Asset["qaStatus"],
    createdAt: String(row.created_at),
  };
}

function mapRun(row: Record<string, unknown>): PipelineRun {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    triggerRunId: (row.trigger_run_id as string | null) ?? null,
    status: row.status as PipelineRun["status"],
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    totalCostUsd: Number(row.total_cost_usd ?? 0),
  };
}

function mapStep(row: Record<string, unknown>): PipelineStep {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    stepNumber: Number(row.step_number),
    stepName: String(row.step_name),
    status: row.status as PipelineStep["status"],
    apiUsed: (row.api_used as string | null) ?? null,
    modelId: (row.model_id as string | null) ?? null,
    durationMs: (row.duration_ms as number | null) ?? null,
    costUsd: Number(row.cost_usd ?? 0),
    error: (row.error as string | null) ?? null,
    attempt: Number(row.attempt ?? 1),
  };
}

function mapTemplate(row: Record<string, unknown>): PromptTemplate {
  return {
    id: String(row.id),
    industry: row.industry as PromptTemplate["industry"],
    slot: String(row.slot),
    promptTemplate: String(row.prompt_template),
    modelId: String(row.model_id),
    defaultParams: (row.default_params as Record<string, unknown>) ?? {},
    isActive: Boolean(row.is_active),
  };
}

export const getBrandProfiles = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("brand_profiles").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapBrandProfile(row));
});

export const getProjects = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapProject(row));
});

export const getPromptTemplates = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("prompt_templates").select("*").eq("is_active", true).order("industry");
  if (error || !data) return [];
  return data.map((row) => mapTemplate(row));
});

export const getProjectDetail = cache(async (projectId: string): Promise<ProjectDetail | null> => {
  noStore();

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data: projectRow }, { data: runRows }, { data: stepRows }, { data: assetRows }, brands] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("pipeline_runs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("pipeline_steps").select("*").order("step_number", { ascending: true }),
    supabase.from("assets").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    getBrandProfiles(),
  ]);

  if (!projectRow) return null;

  const project = mapProject(projectRow);
  const run = runRows?.[0] ? mapRun(runRows[0]) : null;
  const steps = run
    ? (stepRows ?? []).filter((row) => row.run_id === run.id).map((row) => mapStep(row))
    : [];
  const assets = await Promise.all(
    (assetRows ?? []).map(async (row) => {
      const asset = mapAsset(row);
      if (!asset.storagePath.startsWith("http")) {
        const { data } = await supabase.storage.from("assets").createSignedUrl(asset.storagePath, 60 * 60);
        if (data?.signedUrl) {
          return {
            ...asset,
            storagePath: data.signedUrl,
          };
        }
      }

      return asset;
    }),
  );

  return {
    project,
    brandProfile: brands.find((item) => item.id === project.brandProfileId) ?? null,
    run,
    steps,
    assets,
  };
});

export const getLatestProjectDetail = cache(async (): Promise<ProjectDetail | null> => {
  const projects = await getProjects();
  const latest = projects[0];
  if (!latest) return null;
  return getProjectDetail(latest.id);
});
