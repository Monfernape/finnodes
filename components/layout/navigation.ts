import {
  HandCoinsIcon,
  LayoutGridIcon,
  LogOutIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ExpenseIcon, ReportIcon, SeatIcon } from "@/components/icons";

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
    title: "Seats",
    icon: SeatIcon,
    href: "/seats",
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
    title: "Reports",
    icon: ReportIcon,
    href: "/reports",
  },
];

export const MOBILE_PRIMARY_NAV: NavigationItem[] = [
  NAVIGATION_ITEMS[0],
  NAVIGATION_ITEMS[2],
  NAVIGATION_ITEMS[5],
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
