import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  ALLOWED_EMAIL_COOKIE,
  ALLOWED_EMAIL_COOKIE_MAX_AGE,
  AUTH_COOKIE_MAX_AGE,
} from "@/utils/auth/allowlist";
import { PeopleRole, resolvePeopleAccess } from "@/utils/auth/people-access";

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
};

const getInvalidMagicLinkResponse = (requestUrl: URL, next: string) => {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("error", "invalid_magic_link");
  return NextResponse.redirect(loginUrl);
};

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
          response.cookies.set({
            name,
            value,
            ...options,
            maxAge: AUTH_COOKIE_MAX_AGE,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );

  let exchangeResult;

  try {
    exchangeResult = await supabase.auth.exchangeCodeForSession(code);
  } catch {
    return getInvalidMagicLinkResponse(requestUrl, next);
  }

  const { data: exchangeData, error: exchangeError } = exchangeResult;

  if (exchangeError) {
    return getInvalidMagicLinkResponse(requestUrl, next);
  }

  const session = exchangeData.session;
  const user = exchangeData.user;

  if (!session || !user) {
    return getInvalidMagicLinkResponse(requestUrl, next);
  }

  const authorizedSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    },
  );
  const access = await resolvePeopleAccess(authorizedSupabase, user);

  if (access?.role === PeopleRole.Manager) {
    response.cookies.set({
      name: ALLOWED_EMAIL_COOKIE,
      value: access.email,
      httpOnly: true,
      maxAge: ALLOWED_EMAIL_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  response.cookies.delete(ALLOWED_EMAIL_COOKIE);

  if (access) {
    return response;
  }

  await supabase.auth.signOut();

  const deniedResponse = NextResponse.redirect(
    new URL("/access-denied", requestUrl.origin),
  );
  copyCookies(response, deniedResponse);
  deniedResponse.cookies.delete(ALLOWED_EMAIL_COOKIE);

  return deniedResponse;
}
