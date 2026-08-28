import { describe, expect, it } from "vitest";

import { PeopleRole } from "@/utils/auth/people-access";
import {
  EMPLOYEE_MOBILE_PRIMARY_NAV,
  EMPLOYEE_NAVIGATION_ITEMS,
  MOBILE_PRIMARY_NAV,
  NAVIGATION_ITEMS,
  SALES_NAV_ITEM,
  getMobilePrimaryNavItems,
  getNavigationItems,
} from "./navigation";

describe("getNavigationItems", () => {
  it("gives a manager the whole workspace, Sales included", () => {
    const items = getNavigationItems(PeopleRole.Manager, true);

    expect(items).toEqual(NAVIGATION_ITEMS);
    expect(items).toContainEqual(SALES_NAV_ITEM);
  });

  it("does not show Sales to an ordinary employee", () => {
    const items = getNavigationItems(PeopleRole.Employee, false);

    expect(items).toEqual(EMPLOYEE_NAVIGATION_ITEMS);
    expect(items).not.toContainEqual(SALES_NAV_ITEM);
  });

  it("adds Sales for an employee who holds a sales title", () => {
    const items = getNavigationItems(PeopleRole.Employee, true);

    expect(items).toContainEqual(SALES_NAV_ITEM);
    // Their own workspace stays exactly as it was, with Sales alongside it.
    expect(items.slice(0, EMPLOYEE_NAVIGATION_ITEMS.length)).toEqual(
      EMPLOYEE_NAVIGATION_ITEMS
    );
    expect(items).toHaveLength(EMPLOYEE_NAVIGATION_ITEMS.length + 1);
  });

  it("hides Sales when the permission is simply not passed", () => {
    expect(getNavigationItems(PeopleRole.Employee)).not.toContainEqual(
      SALES_NAV_ITEM
    );
  });

  it("never lists Sales twice for a manager", () => {
    const salesEntries = getNavigationItems(PeopleRole.Manager, true).filter(
      (item) => item.href === SALES_NAV_ITEM.href
    );

    expect(salesEntries).toHaveLength(1);
  });

  it("falls back to the manager menu when the role is not yet known", () => {
    // Matches the previous behaviour: the layout renders before access resolves.
    expect(getNavigationItems(null)).toEqual(NAVIGATION_ITEMS);
  });
});

describe("getMobilePrimaryNavItems", () => {
  it("keeps two tabs, whoever is looking", () => {
    expect(getMobilePrimaryNavItems(PeopleRole.Manager, true)).toHaveLength(2);
    expect(getMobilePrimaryNavItems(PeopleRole.Employee, false)).toHaveLength(2);
    expect(getMobilePrimaryNavItems(PeopleRole.Employee, true)).toHaveLength(2);
  });

  it("leaves the manager bar alone", () => {
    expect(getMobilePrimaryNavItems(PeopleRole.Manager, true)).toEqual(
      MOBILE_PRIMARY_NAV
    );
  });

  it("leaves an ordinary employee's bar alone", () => {
    expect(getMobilePrimaryNavItems(PeopleRole.Employee, false)).toEqual(
      EMPLOYEE_MOBILE_PRIMARY_NAV
    );
  });

  it("puts Sales on the bar for a salesperson", () => {
    const items = getMobilePrimaryNavItems(PeopleRole.Employee, true);

    expect(items).toContainEqual(SALES_NAV_ITEM);
    expect(items[0]).toEqual(EMPLOYEE_NAVIGATION_ITEMS[0]);
  });

  it("only ever puts tabs on the bar that the menu also lists", () => {
    // A tab the nav does not contain would be unreachable from the More sheet.
    const cases: { role: PeopleRole; canAccessSales: boolean }[] = [
      { role: PeopleRole.Manager, canAccessSales: true },
      { role: PeopleRole.Employee, canAccessSales: true },
      { role: PeopleRole.Employee, canAccessSales: false },
    ];

    cases.forEach(({ role, canAccessSales }) => {
      const menu = getNavigationItems(role, canAccessSales);
      getMobilePrimaryNavItems(role, canAccessSales).forEach((item) => {
        expect(menu).toContainEqual(item);
      });
    });
  });
});
