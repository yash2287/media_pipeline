import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { hasAdminStorage, triggerEnv } from "./env";

export function createAdminClient() {
  if (!hasAdminStorage()) {
    return null;
  }

  return createClient(triggerEnv.supabaseUrl!, triggerEnv.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: ws as any,
    },
  });
}
