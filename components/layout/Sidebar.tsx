"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UsersIcon,
  SeatIcon,
  ReportIcon,
  ExpenseIcon,
} from "@/components/icons";
import { usePathname } from "next/navigation";

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
    title: "Managers",
    icon: UsersIcon,
    href: "/managers",
  },
  {
    title: "Reports",
    icon: ReportIcon,
    href: "/reports",
  },
  {
    title: "Salary sheet",
    icon: ReportIcon,
    href: "/salary-sheet",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();

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
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${
                pathname === item.href ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
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
