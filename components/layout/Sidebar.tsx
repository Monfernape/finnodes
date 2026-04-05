"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";

import { NAVIGATION_ITEMS } from "./navigation";

type SidebarProps = {
  onNavigate?: () => void;
};

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  useRoutePrefetch(["/expenses", ...NAVIGATION_ITEMS.map((item) => item.href)]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full max-h-screen flex-col">
      <div className="flex h-20 items-center border-b px-5">
        <Link
          href="/expenses"
          prefetch
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 rounded-2xl"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <Image
              src="/icons/icon-192.png"
              alt="FinNodes logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.75rem] font-semibold leading-none tracking-tight text-gray-950">
              FinNodes
            </p>
            <p className="truncate pt-1 text-sm leading-none text-gray-500">
              Finance portal
            </p>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start gap-2 px-4 text-sm font-medium">
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                pathname === item.href && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
              )}
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
