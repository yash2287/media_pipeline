"use server";

import { redirect } from "next/navigation";
import { env, hasSupabaseEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requestMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!hasSupabaseEnv()) {
    redirect("/projects");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase || !email) {
    return;
  }

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.appUrl}/auth/callback`,
    },
  });
}

