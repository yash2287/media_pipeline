import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as { projectId?: string; filenames?: string[] };
  if (!body.projectId || !body.filenames?.length) {
    return NextResponse.json({ error: "projectId and filenames are required." }, { status: 400 });
  }

  const uploads = await Promise.all(
    body.filenames.map(async (filename) => {
      const path = `${body.projectId}/raw/${Date.now()}-${filename.replace(/\s+/g, "-")}`;
      const { data, error } = await supabase.storage.from("assets").createSignedUploadUrl(path);

      return {
        path,
        token: data?.token ?? null,
        error: error?.message ?? null,
      };
    }),
  );

  return NextResponse.json({ uploads });
}

