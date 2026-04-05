import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ALLOWED_EMAIL_COOKIE,
  ALLOWED_EMAIL_COOKIE_MAX_AGE,
  isEmailAllowListed,
  normalizeEmail,
} from "@/utils/auth/allowlist";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  let response = NextResponse.redirect(new URL(next, requestUrl.origin));

  if (!code) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  await supabase.auth.exchangeCodeForSession(code);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const normalizedEmail = normalizeEmail(session?.user?.email ?? null);

  if (normalizedEmail && (await isEmailAllowListed(supabase, normalizedEmail))) {
    response.cookies.set({
      name: ALLOWED_EMAIL_COOKIE,
      value: normalizedEmail,
      httpOnly: true,
      maxAge: ALLOWED_EMAIL_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  } else {
    response.cookies.delete(ALLOWED_EMAIL_COOKIE);
  }

  return response;
}
