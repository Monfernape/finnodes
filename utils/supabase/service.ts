import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for work that runs with no signed-in user, which today
 * means the announcement reminder cron. It bypasses row level security, so it
 * must never be constructed from anything reachable by a browser.
 */
export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
