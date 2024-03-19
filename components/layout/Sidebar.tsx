import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UsersIcon,
  SeatIcon,
  ReportIcon,
  ExpenseIcon,
} from "@/components/icons";

const SIDEBAR_ITEMS = [
  {
    title: "Expenses",
    icon: ExpenseIcon,
    href: "/expenses",
  },
  {
    title: "Seats",
    icon: SeatIcon,
    href: "/seats",
  },
  {
    title: "Reports",
    icon: ReportIcon,
    href: "/reports",
  },
  {
    title: "Managers",
    icon: UsersIcon,
    href: "/managers",
  },
];

export const Sidebar = () => {
  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex items-center border-b p-2">
        <Image
          src={`/images/devnodes.png`}
          alt="DevNodes Icon"
          width="190"
          height="190"
        />
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {SIDEBAR_ITEMS.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
