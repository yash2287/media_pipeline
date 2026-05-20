"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tasks } from "@trigger.dev/sdk";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { hasTriggerEnv } from "@/lib/env";

function parsePalette(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hex, role] = entry.split(":");
      return { hex: hex?.trim() ?? "#000000", role: role?.trim() ?? "accent" };
    });
}

function parseList(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMarketplaces(raw: FormDataEntryValue[]): string[] {
  return raw
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);
}

function parseSkuTable(raw: string) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length && !line.startsWith("#"));

  return lines.map((line, idx) => {
    // CSV-ish: id,name,material,dimensionsCm,weightG,keyFeature,priceTier
    const cells = line.split(/[,\t]/).map((c) => c.trim());
    return {
      id: cells[0] || `sku_${String(idx + 1).padStart(3, "0")}`,
      name: cells[1] || undefined,
      material: cells[2] || undefined,
      dimensionsCm: cells[3] || undefined,
      weightG: cells[4] ? Number(cells[4]) : undefined,
      keyFeature: cells[5] || undefined,
      priceTier: cells[6] || undefined,
    };
  });
}

function parseCarouselCopy(raw: string) {
  // Lines like: 1|Stop scrolling|We made this for you|Tap to shop
  if (!raw.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): { slide: number; headline?: string; subhead?: string; cta?: string } | null => {
      const [slideStr, headline, subhead, cta] = line.split("|").map((s) => s?.trim() ?? "");
      const slide = Number(slideStr);
      if (!slide || Number.isNaN(slide)) return null;
      return { slide, headline: headline || undefined, subhead: subhead || undefined, cta: cta || undefined };
    })
    .filter((entry): entry is { slide: number; headline?: string; subhead?: string; cta?: string } => entry !== null);
}

function buildBrief(formData: FormData) {
  const tone = parseList(String(formData.get("tone") ?? ""));
  const valueProps = parseList(String(formData.get("valueProps") ?? ""));
  const skus = parseSkuTable(String(formData.get("skuTable") ?? ""));
  const carouselCopy = parseCarouselCopy(String(formData.get("carouselCopy") ?? ""));

  return {
    campaignName: String(formData.get("campaignName") ?? "") || undefined,
    hook: String(formData.get("hook") ?? "") || undefined,
    valueProps: valueProps.length ? valueProps : undefined,
    cta: String(formData.get("cta") ?? "") || undefined,
    targetAudience: String(formData.get("targetAudience") ?? "") || undefined,
    tone: tone.length ? tone : undefined,
    season: String(formData.get("season") ?? "") || undefined,
    launchDate: String(formData.get("launchDate") ?? "") || null,

    lighting: (String(formData.get("lighting") ?? "") || undefined) as
      | "studio"
      | "window"
      | "golden_hour"
      | "overcast"
      | "hard_product"
      | "moody"
      | "neon"
      | undefined,
    scene: (String(formData.get("scene") ?? "") || undefined) as
      | "marble"
      | "linen"
      | "wood"
      | "concrete"
      | "outdoor"
      | "tabletop"
      | "studio_white"
      | "studio_dark"
      | "lifestyle_room"
      | "on_model"
      | undefined,
    framing: (String(formData.get("framing") ?? "") || undefined) as
      | "eye_level"
      | "top_down"
      | "three_quarter"
      | "macro"
      | "low_angle"
      | undefined,
    colorGrade: (String(formData.get("colorGrade") ?? "neutral") || "neutral") as
      | "neutral"
      | "warm_magazine"
      | "cool_tech"
      | "kinfolk_natural"
      | "high_contrast",

    carouselSlides: Number(formData.get("carouselSlides") ?? 0) || undefined,
    carouselCopy: carouselCopy.length ? carouselCopy : undefined,

    watermark: formData.get("watermark") === "on",
    captionAutoGen: formData.get("captionAutoGen") === "on",
    companionExports: formData.get("companionExports") === "on",
    smartCrop: formData.get("smartCrop") !== "off",
    generateListingCsv: formData.get("generateListingCsv") !== "off",

    skus: skus.length ? skus : undefined,
  };
}

type AdminClient = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

async function resolveBrandId(
  supabase: AdminClient,
  formData: FormData,
): Promise<string | null> {
  const existingId = String(formData.get("brandProfileId") ?? "").trim() || null;
  const brandName = String(formData.get("brandName") ?? "").trim();

  if (existingId) {
    // Update existing brand if its fields are provided
    if (brandName) {
      await supabase.from("brand_profiles").update({
        name: brandName,
        industry: String(formData.get("industry") ?? "other"),
        color_palette: parsePalette(String(formData.get("colorPalette") ?? "")),
        style_keywords: parseList(String(formData.get("styleKeywords") ?? "")),
        tone_keywords: parseList(String(formData.get("brandToneKeywords") ?? "")),
        brand_guidelines_md: String(formData.get("brandGuidelines") ?? ""),
      }).eq("id", existingId);
    }
    return existingId;
  }

  if (!brandName) return null;

  const { data: brand } = await supabase
    .from("brand_profiles")
    .insert({
      name: brandName,
      industry: String(formData.get("industry") ?? "other"),
      color_palette: parsePalette(String(formData.get("colorPalette") ?? "")),
      style_keywords: parseList(String(formData.get("styleKeywords") ?? "")),
      tone_keywords: parseList(String(formData.get("brandToneKeywords") ?? "")),
      brand_guidelines_md: String(formData.get("brandGuidelines") ?? ""),
    })
    .select("id")
    .single();
  return brand?.id ?? null;
}

async function uploadRawAssets(
  supabase: AdminClient,
  projectId: string,
  formData: FormData,
  briefSkus: Array<{ id: string }> | undefined,
  startingSkuIndex: number,
) {
  const files = formData
    .getAll("rawAssets")
    .filter((value): value is File => value instanceof File && value.size > 0);
  for (const [index, file] of files.entries()) {
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const storagePath = `${projectId}/raw/${filename}`;
    await supabase.storage.from("assets").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    const absoluteIndex = startingSkuIndex + index;
    await supabase.from("assets").insert({
      project_id: projectId,
      sku_id:
        briefSkus?.[absoluteIndex]?.id ??
        `sku_${String(absoluteIndex + 1).padStart(3, "0")}`,
      kind: "raw",
      storage_path: storagePath,
      width: null,
      height: null,
      mime_type: file.type || null,
      metadata: { source: "operator_upload" },
      qa_status: "pending",
    });
  }
  return files.length;
}

async function uploadReferenceAssets(
  supabase: AdminClient,
  projectId: string,
  formData: FormData,
) {
  const refFiles = formData
    .getAll("referenceAssets")
    .filter((value): value is File => value instanceof File && value.size > 0);
  for (const file of refFiles) {
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const storagePath = `${projectId}/reference/${filename}`;
    await supabase.storage.from("assets").upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    await supabase.from("assets").insert({
      project_id: projectId,
      sku_id: "reference",
      kind: "reference",
      storage_path: storagePath,
      width: null,
      height: null,
      mime_type: file.type || null,
      metadata: { refTag: String(formData.get("referenceTag") ?? "mood") || "mood" },
      qa_status: "pending",
    });
  }
  return refFiles.length;
}

export async function createProjectAction(formData: FormData) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  const brandProfileId = await resolveBrandId(supabase, formData);

  const brief = buildBrief(formData);
  const marketplaces = parseMarketplaces(formData.getAll("targetMarketplaces"));
  const variantsPerSlot = Math.max(1, Math.min(5, Number(formData.get("variantsPerSlot") ?? 1)));
  const budgetCapRaw = String(formData.get("budgetCapUsd") ?? "").trim();
  const budgetCapUsd = budgetCapRaw ? Number(budgetCapRaw) : null;

  const { data: project } = await supabase!
    .from("projects")
    .insert({
      brand_profile_id: brandProfileId,
      client_name: String(formData.get("clientName") ?? "Unnamed client"),
      client_email: String(formData.get("clientEmail") ?? "") || null,
      pack_type: String(formData.get("packType") ?? "marketplace"),
      due_at: String(formData.get("dueAt") ?? "") || null,
      status: "intake",
      brief,
      target_marketplaces: marketplaces,
      variants_per_slot: variantsPerSlot,
      budget_cap_usd: budgetCapUsd,
    })
    .select("id")
    .single();

  if (project) {
    await uploadRawAssets(supabase, project.id, formData, brief.skus, 0);
    await uploadReferenceAssets(supabase, project.id, formData);
  }

  revalidatePath("/projects");
  if (!project?.id) {
    throw new Error("Project creation failed.");
  }
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Missing projectId.");

  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  const brandProfileId = await resolveBrandId(supabase, formData);

  const brief = buildBrief(formData);
  const marketplaces = parseMarketplaces(formData.getAll("targetMarketplaces"));
  const variantsPerSlot = Math.max(1, Math.min(5, Number(formData.get("variantsPerSlot") ?? 1)));
  const budgetCapRaw = String(formData.get("budgetCapUsd") ?? "").trim();
  const budgetCapUsd = budgetCapRaw ? Number(budgetCapRaw) : null;

  await supabase
    .from("projects")
    .update({
      brand_profile_id: brandProfileId,
      client_name: String(formData.get("clientName") ?? "Unnamed client"),
      client_email: String(formData.get("clientEmail") ?? "") || null,
      pack_type: String(formData.get("packType") ?? "marketplace"),
      due_at: String(formData.get("dueAt") ?? "") || null,
      brief,
      target_marketplaces: marketplaces,
      variants_per_slot: variantsPerSlot,
      budget_cap_usd: budgetCapUsd,
    })
    .eq("id", projectId);

  // Find current raw asset count so newly uploaded files get the right SKU index
  const { data: existingRaw } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .eq("kind", "raw");

  await uploadRawAssets(supabase, projectId, formData, brief.skus, existingRaw?.length ?? 0);
  await uploadReferenceAssets(supabase, projectId, formData);

  // If the project was in a failed state, reset it back to intake so the operator can re-run.
  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();
  if (project?.status === "failed") {
    await supabase.from("projects").update({ status: "intake" }).eq("id", projectId);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/intake`);
  redirect(`/projects/${projectId}`);
}

export async function uploadAssetsAction(formData: FormData) {
  // Lightweight assets-only upload used by the project intake page.
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Missing projectId.");

  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  // If brand fields are present, persist them (operator may tweak brand from intake page)
  if (String(formData.get("brandName") ?? "").trim() || String(formData.get("brandProfileId") ?? "").trim()) {
    const brandProfileId = await resolveBrandId(supabase, formData);
    if (brandProfileId) {
      await supabase
        .from("projects")
        .update({ brand_profile_id: brandProfileId })
        .eq("id", projectId);
    }
  }

  const { data: existingRaw } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .eq("kind", "raw");

  await uploadRawAssets(supabase, projectId, formData, undefined, existingRaw?.length ?? 0);
  await uploadReferenceAssets(supabase, projectId, formData);

  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();
  if (project?.status === "failed") {
    await supabase.from("projects").update({ status: "intake" }).eq("id", projectId);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/intake`);
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!projectId) throw new Error("Missing projectId.");
  if (confirm !== "DELETE") {
    throw new Error("Type DELETE to confirm.");
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  // 1. Delete storage objects under this project's prefix.
  // Storage doesn't support recursive delete; list and remove each one.
  const storage = supabase.storage.from("assets");
  const prefixes = [
    `${projectId}/raw`,
    `${projectId}/reference`,
    `${projectId}/cutouts`,
    `${projectId}/generated`,
    `${projectId}/upscaled`,
    `${projectId}/final`,
    `${projectId}/companion`,
    `${projectId}/deliveries`,
  ];
  for (const prefix of prefixes) {
    const { data: items } = await storage.list(prefix, { limit: 1000 });
    if (items?.length) {
      const paths = items.map((item) => `${prefix}/${item.name}`);
      await storage.remove(paths);
    }
  }

  // 2. Delete DB rows. assets + pipeline_runs cascade to pipeline_steps.
  // Cascade rules: assets ON DELETE CASCADE, pipeline_runs ON DELETE CASCADE.
  // The project FK uses ON DELETE CASCADE on both children, so a single delete works.
  await supabase.from("projects").delete().eq("id", projectId);

  revalidatePath("/projects");
  redirect("/projects");
}

export async function resetRunStateAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Missing projectId.");

  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase service role is not configured.");

  // Mark any queued/running run as failed and reset the project to intake.
  await supabase
    .from("pipeline_runs")
    .update({
      status: "failed",
      error: "Reset by operator before pipeline could complete.",
      completed_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .in("status", ["queued", "running"]);

  await supabase
    .from("projects")
    .update({ status: "intake" })
    .eq("id", projectId)
    .in("status", ["running", "failed"]);

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function runPipelineAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  if (!hasTriggerEnv()) {
    throw new Error("Trigger.dev is not configured for pipeline runs.");
  }

  const supabase = createAdminSupabaseClient();
  let runId: string | null = null;
  if (supabase) {
    // Pre-flight: project must have at least one raw asset, otherwise the
    // intake step will burn a run only to fail. Bail with a clear message.
    const { count: rawCount } = await supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("kind", "raw");
    if (!rawCount || rawCount === 0) {
      throw new Error(
        "No source photos uploaded yet. Open the project and use Edit or Intake to add raw assets first.",
      );
    }

    const { data: activeRun } = await supabase
      .from("pipeline_runs")
      .select("id,status")
      .eq("project_id", projectId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRun) {
      throw new Error(
        "A pipeline run is already queued or running for this project. Use Reset run if it's stuck.",
      );
    }

    const { data: run } = await supabase
      .from("pipeline_runs")
      .insert({
        project_id: projectId,
        status: "queued",
      })
      .select("id")
      .single();

    if (run) {
      runId = run.id;
      await supabase.from("projects").update({ status: "running" }).eq("id", projectId);
    }
  }

  const handle = await tasks.trigger("run-pipeline", { projectId });
  if (supabase && runId && handle?.id) {
    await supabase.from("pipeline_runs").update({ trigger_run_id: handle.id }).eq("id", runId);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function resumePipelineAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  if (!hasTriggerEnv()) {
    throw new Error("Trigger.dev is not configured for pipeline runs.");
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for pipeline resume.");
  }

  const { data: activeRun } = await supabase
    .from("pipeline_runs")
    .select("id,status")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun) {
    throw new Error("A pipeline run is already queued or running for this project.");
  }

  const { data: resumableRun } = await supabase
    .from("pipeline_runs")
    .select("id,status")
    .eq("project_id", projectId)
    .in("status", ["failed", "canceled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!resumableRun) {
    throw new Error("No failed or canceled pipeline run was found to resume.");
  }

  // Resume from the first step that didn't reach "succeeded". This covers both
  // an explicit "failed" step row and a step row stuck on "running" because the
  // orchestrator was canceled (e.g. dev-mode disconnect) before it could write
  // the terminal status.
  const { data: stuckStep } = await supabase
    .from("pipeline_steps")
    .select("step_number")
    .eq("run_id", resumableRun.id)
    .neq("status", "succeeded")
    .order("step_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  const resumeFromStep = Math.max(1, Math.min(7, Number(stuckStep?.step_number ?? 1)));

  await supabase
    .from("pipeline_runs")
    .update({
      status: "queued",
      error: null,
      completed_at: null,
    })
    .eq("id", resumableRun.id);

  await supabase.from("projects").update({ status: "running" }).eq("id", projectId);

  const handle = await tasks.trigger("run-pipeline", { projectId, resumeFromStep });
  if (handle?.id) {
    await supabase.from("pipeline_runs").update({ trigger_run_id: handle.id }).eq("id", resumableRun.id);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function approveAssetAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = createAdminSupabaseClient();
  if (supabase && assetId) {
    await supabase.from("assets").update({ qa_status: "approved" }).eq("id", assetId);
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/delivery`);
}

export async function bulkApproveAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const threshold = Math.max(0, Math.min(100, Number(formData.get("threshold") ?? 85)));
  const supabase = createAdminSupabaseClient();
  if (!supabase || !projectId) return;

  await supabase
    .from("assets")
    .update({ qa_status: "approved" })
    .eq("project_id", projectId)
    .eq("kind", "final")
    .neq("qa_status", "approved")
    .gte("qa_score", threshold);

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/review`);
}

export async function rejectAssetAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = createAdminSupabaseClient();
  if (supabase && assetId) {
    await supabase.from("assets").update({ qa_status: "rejected" }).eq("id", assetId);
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/delivery`);
}

export async function rerunAssetAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!hasTriggerEnv()) {
    throw new Error("Trigger.dev is not configured for asset re-runs.");
  }
  const supabase = createAdminSupabaseClient();

  if (supabase && assetId) {
    await supabase.from("assets").update({ qa_status: "pending", qa_score: null }).eq("id", assetId);
  }

  if (assetId && projectId) {
    await tasks.trigger("generate-scene", { projectId, assetId, rerun: true });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/review`);
}

export async function deliverProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!hasTriggerEnv()) {
    throw new Error("Trigger.dev is not configured for delivery jobs.");
  }

  if (projectId) {
    await tasks.trigger("deliver-assets", { projectId });
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/delivery`);
}
