import {
  FileTextIcon,
  HandCoinsIcon,
  LayoutGridIcon,
  LogOutIcon,
  MegaphoneIcon,
  NotebookPenIcon,
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
    title: "Tax",
    icon: PercentIcon,
    href: "/tax",
  },
  {
    title: "Announcements",
    icon: MegaphoneIcon,
    href: "/announcements",
  },
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

export const getNavigationItems = (role: PeopleRole | null | undefined) =>
  role === PeopleRole.Employee ? EMPLOYEE_NAVIGATION_ITEMS : NAVIGATION_ITEMS;

export const getMobilePrimaryNavItems = (
  role: PeopleRole | null | undefined,
) => (role === PeopleRole.Employee ? EMPLOYEE_MOBILE_PRIMARY_NAV : MOBILE_PRIMARY_NAV);
