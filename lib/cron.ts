import { type NextRequest } from "next/server";

/**
 * Shared gate for the scheduled endpoints.
 *
 * Vercel Cron sends the secret as a bearer token. The query parameter exists so
 * a run can be triggered by hand from a terminal, which is how a dry run gets
 * exercised. With no CRON_SECRET configured nothing is authorised, so a missing
 * env var fails closed rather than opening the endpoint up.
 */
export const isCronAuthorized = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  if (request.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }

  return request.nextUrl.searchParams.get("secret") === secret;
};

export const isDryRun = (request: NextRequest) =>
  ["1", "true"].includes(request.nextUrl.searchParams.get("dryRun") ?? "");
