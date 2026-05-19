export const triggerEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
  falKey: process.env.FAL_KEY,
  googleDriveClientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
  googleDrivePrivateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY,
  googleDriveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
};

export function hasAdminStorage() {
  return Boolean(triggerEnv.supabaseUrl && triggerEnv.supabaseServiceRoleKey);
}

