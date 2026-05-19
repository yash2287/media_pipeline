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

export async function createProjectAction(formData: FormData) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service role is not configured.");
  }

  let brandProfileId = String(formData.get("brandProfileId") ?? "").trim() || null;

  if (!brandProfileId && formData.get("brandName")) {
    const { data: brand } = await supabase!
      .from("brand_profiles")
      .insert({
        name: String(formData.get("brandName")),
        industry: String(formData.get("industry") ?? "other"),
        color_palette: parsePalette(String(formData.get("colorPalette") ?? "")),
        style_keywords: parseList(String(formData.get("styleKeywords") ?? "")),
        brand_guidelines_md: String(formData.get("brandGuidelines") ?? ""),
      })
      .select("id")
      .single();

    brandProfileId = brand?.id ?? null;
  }

  const { data: project } = await supabase!
    .from("projects")
    .insert({
      brand_profile_id: brandProfileId,
      client_name: String(formData.get("clientName") ?? "Unnamed client"),
      client_email: String(formData.get("clientEmail") ?? "") || null,
      pack_type: String(formData.get("packType") ?? "marketplace"),
      due_at: String(formData.get("dueAt") ?? "") || null,
      status: "intake",
    })
    .select("id")
    .single();

  if (project) {
    const files = formData.getAll("rawAssets").filter((value): value is File => value instanceof File && value.size > 0);
    for (const [index, file] of files.entries()) {
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const storagePath = `${project.id}/raw/${filename}`;
      await supabase!.storage.from("assets").upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

      await supabase!.from("assets").insert({
        project_id: project.id,
        sku_id: `sku_${String(index + 1).padStart(3, "0")}`,
        kind: "raw",
        storage_path: storagePath,
        width: null,
        height: null,
        mime_type: file.type || null,
        metadata: { source: "operator_upload" },
        qa_status: "pending",
      });
    }
  }

  revalidatePath("/projects");
  if (!project?.id) {
    throw new Error("Project creation failed.");
  }
  redirect(`/projects/${project.id}`);
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
