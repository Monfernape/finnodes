import type { SupabaseClient } from "@supabase/supabase-js";

export const ALLOWED_EMAIL_COOKIE = "finnodes-allowed-email";
export const ALLOWED_EMAIL_COOKIE_MAX_AGE = 60 * 60 * 24;

export const normalizeEmail = (email: string | null) =>
  email?.trim().toLowerCase() ?? null;

export const getEnvAllowList = () =>
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

export const isEmailAllowListed = async (
  supabase: SupabaseClient,
  email: string | null,
): Promise<boolean> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const envAllowList = getEnvAllowList();
  if (envAllowList.includes(normalizedEmail)) {
    return true;
  }

  const { data, error } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.warn("Allowlist lookup failed, falling back to env list", error);
    return false;
  }

  return Boolean(data);
};
