import { describe, expect, it } from "vitest";

import { isEmployeeAllowedPath } from "./employee-paths";

describe("isEmployeeAllowedPath", () => {
  it.each(["/me", "/me/one-on-ones", "/login", "/access-denied", "/sw.js"])(
    "lets every employee reach %s",
    (pathname) => {
      expect(isEmployeeAllowedPath(pathname, false)).toBe(true);
    }
  );

  it.each(["/", "/employees", "/salaries", "/tax", "/reports", "/announcements"])(
    "keeps an employee out of %s",
    (pathname) => {
      expect(isEmployeeAllowedPath(pathname, false)).toBe(false);
      // Sales access opens Sales and nothing else.
      expect(isEmployeeAllowedPath(pathname, true)).toBe(false);
    }
  );

  it("opens /sales only to an employee holding a sales title", () => {
    expect(isEmployeeAllowedPath("/sales", false)).toBe(false);
    expect(isEmployeeAllowedPath("/sales", true)).toBe(true);
  });

  it.each(["/sales/12", "/sales/new", "/sales/strategies", "/sales/strategies/3/edit"])(
    "opens %s to a salesperson",
    (pathname) => {
      expect(isEmployeeAllowedPath(pathname, true)).toBe(true);
      expect(isEmployeeAllowedPath(pathname, false)).toBe(false);
    }
  );

  it("does not let /sales open /salaries, which merely starts the same way", () => {
    // The prefix check has to stop at a path boundary.
    expect(isEmployeeAllowedPath("/salaries", true)).toBe(false);
    expect(isEmployeeAllowedPath("/salaries/4", true)).toBe(false);
    expect(isEmployeeAllowedPath("/sales-report", true)).toBe(false);
  });
});
