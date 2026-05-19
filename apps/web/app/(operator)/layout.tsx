import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/navigation/AppShell";
import { signOutAction } from "@/app/(operator)/actions";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | undefined;

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase!.auth.getUser();
    if (!data.user) {
      redirect("/login");
    }
    userEmail = data.user.email;
  }

  return (
    <AppShell userEmail={userEmail} onSignOut={signOutAction}>
      {children}
    </AppShell>
  );
}
