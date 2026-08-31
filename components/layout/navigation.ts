import {
  FileTextIcon,
  HandCoinsIcon,
  LayoutGridIcon,
  LogOutIcon,
  BanknoteIcon,
  MegaphoneIcon,
  NotebookPenIcon,
  PhoneCallIcon,
  PercentIcon,
  ReceiptTextIcon,
  StarIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ExpenseIcon, ReportIcon, SeatIcon } from "@/components/icons";
import { PeopleRole } from "@/utils/auth/people-access";

export type NavigationItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** Shared, because salespeople who are not managers reach Sales too. */
export const SALES_NAV_ITEM: NavigationItem = {
  title: "Sales",
  icon: PhoneCallIcon,
  href: "/sales",
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "Expenses",
    icon: ExpenseIcon,
    href: "/",
  },
  {
    title: "Employees",
    icon: SeatIcon,
    href: "/employees",
  },
  {
    title: "Loans",
    icon: HandCoinsIcon,
    href: "/loans",
  },
  {
    title: "Managers",
    icon: UsersIcon,
    href: "/managers",
  },
  {
    title: "Salaries",
    icon: WalletCardsIcon,
    href: "/salaries",
  },
  {
    title: "Taxes",
    icon: PercentIcon,
    href: "/tax",
  },
  {
    title: "Announcements",
    icon: MegaphoneIcon,
    href: "/announcements",
  },
  SALES_NAV_ITEM,
  {
    title: "Reports",
    icon: ReportIcon,
    href: "/reports",
  },
];

export const EMPLOYEE_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "1:1s",
    icon: NotebookPenIcon,
    href: "/me/one-on-ones",
  },
  {
    title: "Reviews",
    icon: StarIcon,
    href: "/me/reviews",
  },
  {
    title: "Salary Slips",
    icon: ReceiptTextIcon,
    href: "/me/salary-slips",
  },
  {
    title: "Tax Salary Slip",
    icon: PercentIcon,
    href: "/me/tax-salary-slip",
  },
  {
    title: "Salary Disbursement",
    icon: BanknoteIcon,
    href: "/me/salary-disbursements",
  },
  {
    title: "Experience Letters",
    icon: FileTextIcon,
    href: "/me/experience-letters",
  },
];

export const MOBILE_PRIMARY_NAV: NavigationItem[] = [
  NAVIGATION_ITEMS[0],
  NAVIGATION_ITEMS[1],
];

export const EMPLOYEE_MOBILE_PRIMARY_NAV = [
  EMPLOYEE_NAVIGATION_ITEMS[0],
  EMPLOYEE_NAVIGATION_ITEMS[1],
];

export const MOBILE_MORE_NAV = {
  title: "More",
  href: "/more",
  icon: LayoutGridIcon,
};

export const SIGN_OUT_NAV = {
  title: "Sign out",
  icon: LogOutIcon,
};

/**
 * An employee holding a sales title gets Sales alongside their own workspace.
 * It is appended rather than built into the employee list because most
 * employees never see it, and the menu should not imply otherwise.
 */
export const getNavigationItems = (
  role: PeopleRole | null | undefined,
  canAccessSales = false
) => {
  if (role !== PeopleRole.Employee) {
    return NAVIGATION_ITEMS;
  }

  return canAccessSales
    ? [...EMPLOYEE_NAVIGATION_ITEMS, SALES_NAV_ITEM]
    : EMPLOYEE_NAVIGATION_ITEMS;
};

/**
 * The two tabs on the mobile bar. For somebody whose job is selling, Sales
 * takes the second slot: it is what they open the app for, and burying it in
 * the More sheet would cost a tap on every call they log. Reviews stays one
 * tap away under More.
 */
export const getMobilePrimaryNavItems = (
  role: PeopleRole | null | undefined,
  canAccessSales = false,
) => {
  if (role !== PeopleRole.Employee) {
    return MOBILE_PRIMARY_NAV;
  }

  return canAccessSales
    ? [EMPLOYEE_NAVIGATION_ITEMS[0], SALES_NAV_ITEM]
    : EMPLOYEE_MOBILE_PRIMARY_NAV;
};
