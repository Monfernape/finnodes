import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_EMAIL_COOKIE,
  ALLOWED_EMAIL_COOKIE_MAX_AGE,
  AUTH_COOKIE_MAX_AGE,
  normalizeEmail,
} from "@/utils/auth/allowlist";
import { PeopleRole, resolvePeopleAccess } from "@/utils/auth/people-access";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/access-denied",
  "/manifest.webmanifest",
  "/sw.js",
];

const getPublicRedirect = (request: NextRequest, pathname: string) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
};

const EMPLOYEE_ALLOWED_PATHS = [
  "/me",
  "/auth/callback",
  "/login",
  "/access-denied",
  "/manifest.webmanifest",
  "/sw.js",
];

const isEmployeeAllowedPath = (pathname: string) =>
  EMPLOYEE_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
};

const getRequestOrigin = (request: NextRequest) => {
  const host = request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");

  if (!host) {
    return request.nextUrl.origin;
  }

  return `${protocol}://${host}`;
};

export const updateSession = async (request: NextRequest) => {
  if (
    request.nextUrl.pathname !== "/auth/callback" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const callbackUrl = new URL("/auth/callback", getRequestOrigin(request));
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    callbackUrl.searchParams.set(
      "next",
      callbackUrl.searchParams.get("next") ?? request.nextUrl.pathname,
    );
    return NextResponse.redirect(callbackUrl);
  }

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
            const previousResponse = response;
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            copyCookies(previousResponse, response);
            response.cookies.set({
              name,
              value,
              ...options,
              maxAge: AUTH_COOKIE_MAX_AGE,
            });
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the cookies for the request and response
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            const previousResponse = response;
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            copyCookies(previousResponse, response);
            response.cookies.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      const cachedManager =
        normalizedEmail !== null && cachedAllowedEmail === normalizedEmail;
      const access = cachedManager
        ? {
            role: PeopleRole.Manager,
            email: normalizedEmail,
            seatId: null,
          }
        : await resolvePeopleAccess(supabase, user);

      if (!access) {
        await supabase.auth.signOut();
        response.cookies.delete(ALLOWED_EMAIL_COOKIE);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/access-denied";
        redirectUrl.search = "";

        const redirectResponse = NextResponse.redirect(redirectUrl);
        copyCookies(response, redirectResponse);
        return redirectResponse;
      }

      if (
        access.role === PeopleRole.Manager &&
        cachedAllowedEmail !== access.email
      ) {
        response.cookies.set({
          name: ALLOWED_EMAIL_COOKIE,
          value: access.email,
          httpOnly: true,
          maxAge: ALLOWED_EMAIL_COOKIE_MAX_AGE,
          path: "/",
          sameSite: "lax",
        });
      } else if (access.role !== PeopleRole.Manager && cachedAllowedEmail) {
        response.cookies.delete(ALLOWED_EMAIL_COOKIE);
      }

      if (
        access.role === PeopleRole.Employee &&
        !isEmployeeAllowedPath(request.nextUrl.pathname)
      ) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/me/one-on-ones";
        redirectUrl.search = "";
        const redirectResponse = NextResponse.redirect(redirectUrl);
        copyCookies(response, redirectResponse);
        return redirectResponse;
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
