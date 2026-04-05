import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_EMAIL_COOKIE,
  ALLOWED_EMAIL_COOKIE_MAX_AGE,
  isEmailAllowListed,
  normalizeEmail,
} from "@/utils/auth/allowlist";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/access-denied",
  "/manifest.webmanifest",
];

const getPublicRedirect = (request: NextRequest, pathname: string) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
};

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
};

export const updateSession = async (request: NextRequest) => {
  const isPublicRoute = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is updated, update the cookies for the request and response
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the cookies for the request and response
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (!user && !isPublicRoute) {
      response.cookies.delete(ALLOWED_EMAIL_COOKIE);
      const redirectUrl = getPublicRedirect(request, "/login");
      const redirectResponse = NextResponse.redirect(redirectUrl);
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }

    if (user) {
      const normalizedEmail = normalizeEmail(user.email ?? null);
      const cachedAllowedEmail = normalizeEmail(
        request.cookies.get(ALLOWED_EMAIL_COOKIE)?.value ?? null,
      );
      const isAllowed =
        normalizedEmail !== null && cachedAllowedEmail === normalizedEmail
          ? true
          : await isEmailAllowListed(supabase, normalizedEmail);

      if (!isAllowed) {
        await supabase.auth.signOut();
        response.cookies.delete(ALLOWED_EMAIL_COOKIE);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/access-denied";
        redirectUrl.search = "";

        const redirectResponse = NextResponse.redirect(redirectUrl);
        copyCookies(response, redirectResponse);
        return redirectResponse;
      }

      if (normalizedEmail && cachedAllowedEmail !== normalizedEmail) {
        response.cookies.set({
          name: ALLOWED_EMAIL_COOKIE,
          value: normalizedEmail,
          httpOnly: true,
          maxAge: ALLOWED_EMAIL_COOKIE_MAX_AGE,
          path: "/",
          sameSite: "lax",
        });
      }
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    if (!isPublicRoute) {
      const redirectUrl = getPublicRedirect(request, "/login");
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }
};
