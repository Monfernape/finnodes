"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UsersIcon,
  SeatIcon,
  ReportIcon,
  ExpenseIcon,
} from "@/components/icons";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { HandCoinsIcon, LogOutIcon } from "lucide-react";

type SidebarProps = {
  onNavigate?: () => void;
};

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
    title: "Reports",
    icon: ReportIcon,
    href: "/reports",
  },
];

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full max-h-screen flex-col">
      <div className="flex items-center justify-center border-b px-6 py-4">
        <Image
          src={`/images/devnodes.png`}
          alt="DevNodes Icon"
          width={150}
          height={48}
          priority
        />
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start gap-2 px-4 text-sm font-medium">
          {SIDEBAR_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${pathname === item.href ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t px-4 py-3">
        <button
          type="button"
          onClick={handleSignOut}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          disabled={signingOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
        >
          <LogOutIcon className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
};
