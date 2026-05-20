export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  triggerSecretKey: process.env.TRIGGER_SECRET_KEY,
  triggerPublicAccessToken: process.env.TRIGGER_PUBLIC_ACCESS_TOKEN,
  openAiApiKey: process.env.OPENAI_API_KEY,
  falKey: process.env.FAL_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  googleDriveClientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
  googleDrivePrivateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY,
  googleDriveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function hasSupabaseServiceRole() {
  return hasSupabaseEnv() && Boolean(env.supabaseServiceRoleKey);
}

export function hasTriggerEnv() {
  return Boolean(env.triggerSecretKey);
}

export function hasOpenAiEnv() {
  return Boolean(env.openAiApiKey);
}

