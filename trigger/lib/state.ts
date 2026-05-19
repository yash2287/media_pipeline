import { createAdminClient } from "./supabase";

type SupabaseClient = NonNullable<ReturnType<typeof createAdminClient>>;
type JsonRecord = Record<string, unknown>;

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function requireAdminClient(): SupabaseClient {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  return supabase;
}

async function runQuery<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
  context: string,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return data;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function assetBelongsToRun(asset: { metadata?: JsonRecord | null }, runId: string) {
  return String(asset.metadata?.runId ?? "") === runId;
}

export async function getProject(projectId: string) {
  const supabase = requireAdminClient();
  const data = await runQuery(
    supabase.from("projects").select("*").eq("id", projectId).single(),
    `Failed to load project ${projectId}`,
  );

  if (!data) {
    throw new Error(`Project not found: ${projectId}`);
  }

  return data;
}

export async function getBrandProfile(brandProfileId: string | null) {
  if (!brandProfileId) return null;

  const supabase = requireAdminClient();
  const data = await runQuery(
    supabase.from("brand_profiles").select("*").eq("id", brandProfileId).single(),
    `Failed to load brand profile ${brandProfileId}`,
  );

  return data;
}

export async function getAsset(assetId: string) {
  const supabase = requireAdminClient();
  const data = await runQuery(
    supabase.from("assets").select("*").eq("id", assetId).single(),
    `Failed to load asset ${assetId}`,
  );

  if (!data) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  return data;
}

export async function listAssets(projectId: string, kind?: string) {
  const supabase = requireAdminClient();

  let query = supabase.from("assets").select("*").eq("project_id", projectId).order("created_at");
  if (kind) {
    query = query.eq("kind", kind);
  }

  const data = await runQuery(query, `Failed to load assets for project ${projectId}`);
  return data ?? [];
}

export async function listRunAssets(projectId: string, kind: string, runId: string) {
  return (await listAssets(projectId, kind)).filter((asset) => assetBelongsToRun(asset, runId));
}

export async function getLatestRun(projectId: string) {
  const supabase = requireAdminClient();
  const data = await runQuery(
    supabase
      .from("pipeline_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    `Failed to load latest pipeline run for project ${projectId}`,
  );

  if (!data) {
    throw new Error(`Pipeline run not found for project: ${projectId}`);
  }

  return data;
}

export async function upsertStep(opts: {
  runId: string;
  stepNumber: number;
  stepName: string;
  status: string;
  inputAssetIds?: string[];
  outputAssetIds?: string[];
  apiUsed?: string | null;
  modelId?: string | null;
  durationMs?: number | null;
  costUsd?: number;
  error?: string | null;
}) {
  const supabase = requireAdminClient();

  const existing = await runQuery(
    supabase
      .from("pipeline_steps")
      .select("id,attempt")
      .eq("run_id", opts.runId)
      .eq("step_number", opts.stepNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    `Failed to load existing pipeline step ${opts.stepNumber} for run ${opts.runId}`,
  );

  const payload = {
    status: opts.status,
    input_asset_ids: opts.inputAssetIds ?? [],
    output_asset_ids: opts.outputAssetIds ?? [],
    api_used: opts.apiUsed ?? null,
    model_id: opts.modelId ?? null,
    duration_ms: opts.durationMs ?? null,
    cost_usd: opts.costUsd ?? 0,
    error: opts.error ?? null,
  };

  if (existing?.id) {
    await runQuery(
      supabase.from("pipeline_steps").update(payload).eq("id", existing.id).select("id").single(),
      `Failed to update pipeline step ${opts.stepNumber} for run ${opts.runId}`,
    );
    await syncRunCosts(opts.runId);
    return existing.id;
  }

  const created = await runQuery(
    supabase
      .from("pipeline_steps")
      .insert({
        run_id: opts.runId,
        step_number: opts.stepNumber,
        step_name: opts.stepName,
        attempt: 1,
        ...payload,
      })
      .select("id")
      .single(),
    `Failed to create pipeline step ${opts.stepNumber} for run ${opts.runId}`,
  );

  await syncRunCosts(opts.runId);
  return created?.id;
}

export async function updateProjectStatus(projectId: string, status: string, extra: Record<string, unknown> = {}) {
  const supabase = requireAdminClient();
  await runQuery(
    supabase.from("projects").update({ status, ...extra }).eq("id", projectId).select("id").single(),
    `Failed to update project ${projectId} status to ${status}`,
  );
}

export async function updateRun(runId: string, patch: Record<string, unknown>) {
  const supabase = requireAdminClient();
  await runQuery(
    supabase.from("pipeline_runs").update(patch).eq("id", runId).select("id,project_id").single(),
    `Failed to update pipeline run ${runId}`,
  );
}

export async function updateAsset(assetId: string, patch: Record<string, unknown>) {
  const supabase = requireAdminClient();
  await runQuery(
    supabase.from("assets").update(patch).eq("id", assetId).select("id").single(),
    `Failed to update asset ${assetId}`,
  );
}

export async function saveAsset(input: {
  projectId: string;
  skuId: string;
  kind: string;
  storagePath: string;
  parentAssetId?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  metadata?: JsonRecord;
  qaScore?: number | null;
  qaStatus?: string;
}) {
  const supabase = requireAdminClient();

  const data = await runQuery(
    supabase
      .from("assets")
      .insert({
        project_id: input.projectId,
        sku_id: input.skuId,
        kind: input.kind,
        storage_path: input.storagePath,
        parent_asset_id: input.parentAssetId ?? null,
        mime_type: input.mimeType ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        metadata: input.metadata ?? {},
        qa_score: input.qaScore ?? null,
        qa_status: input.qaStatus ?? "pending",
      })
      .select("*")
      .single(),
    `Failed to persist ${input.kind} asset for ${input.skuId}`,
  );

  return data;
}

export async function resolveAssetUrl(storagePath: string, expiresInSeconds = 60 * 60) {
  if (isAbsoluteHttpUrl(storagePath)) {
    return storagePath;
  }

  const supabase = requireAdminClient();
  const data = await runQuery(
    supabase.storage.from("assets").createSignedUrl(storagePath, expiresInSeconds),
    `Failed to sign asset URL for ${storagePath}`,
  );

  if (!data?.signedUrl || !isAbsoluteHttpUrl(data.signedUrl)) {
    throw new Error(`Failed to resolve a valid signed URL for storage path: ${storagePath}`);
  }

  return data.signedUrl;
}

export async function uploadBuffer(path: string, buffer: Buffer, contentType: string) {
  const supabase = requireAdminClient();

  await runQuery(
    supabase.storage.from("assets").upload(path, buffer, {
      contentType,
      upsert: true,
    }),
    `Failed to upload asset buffer to ${path}`,
  );

  return { path };
}

export async function syncRunCosts(runId: string) {
  const supabase = requireAdminClient();

  const run = await runQuery(
    supabase.from("pipeline_runs").select("id,project_id").eq("id", runId).single(),
    `Failed to load pipeline run ${runId} for cost sync`,
  );
  if (!run) {
    throw new Error(`Pipeline run not found during cost sync: ${runId}`);
  }

  const steps = await runQuery(
    supabase.from("pipeline_steps").select("cost_usd").eq("run_id", runId),
    `Failed to load pipeline step costs for run ${runId}`,
  );

  const totalCostUsd = Number(
    (steps ?? [])
      .reduce((sum, step) => sum + Number(step.cost_usd ?? 0), 0)
      .toFixed(4),
  );

  await runQuery(
    supabase
      .from("pipeline_runs")
      .update({ total_cost_usd: totalCostUsd })
      .eq("id", runId)
      .select("id")
      .single(),
    `Failed to update pipeline run ${runId} cost`,
  );

  await runQuery(
    supabase
      .from("projects")
      .update({ total_cost_usd: totalCostUsd })
      .eq("id", run.project_id)
      .select("id")
      .single(),
    `Failed to update project ${run.project_id} cost`,
  );
}
