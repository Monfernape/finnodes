/**
 * Which routes an employee may reach.
 *
 * Kept out of the middleware so it can be tested directly: this is the check
 * that stands between an ordinary employee and the manager side of the app,
 * and the one path that opens conditionally — `/sales` — sits next to routes
 * whose names start the same way.
 */
export const EMPLOYEE_ALLOWED_PATHS = [
  "/me",
  "/auth/callback",
  "/login",
  "/access-denied",
  "/manifest.webmanifest",
  "/sw.js",
];

/** Open to an employee only when they hold a title that grants sales access. */
export const SALES_PATH = "/sales";

const matchesPath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

export const isEmployeeAllowedPath = (
  pathname: string,
  canAccessSales: boolean
) => {
  if (canAccessSales && matchesPath(pathname, SALES_PATH)) {
    return true;
  }

  return EMPLOYEE_ALLOWED_PATHS.some((path) => matchesPath(pathname, path));
};
