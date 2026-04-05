"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOutIcon, X } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { Button } from "@/components/ui/button";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { NAVIGATION_ITEMS } from "./navigation";

type SidebarProps = {
  onNavigate?: () => void;
};

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();

  useRoutePrefetch(["/expenses", ...NAVIGATION_ITEMS.map((item) => item.href)]);

  const handleNavigate = () => {
    onNavigate?.();

    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push("/login");
  };

  return (
    <UISidebar>
      <SidebarHeader className="relative flex items-start px-3 pb-2 pt-4">
        <Link
          href="/expenses"
          prefetch
          onClick={handleNavigate}
          className="flex min-w-0 items-center gap-3 rounded-2xl p-2"
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
        {isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpenMobile(false)}
            className="absolute right-3 top-3 h-10 w-10 rounded-full bg-white/90 shadow-sm backdrop-blur"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarMenu className="px-4">
          {NAVIGATION_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href} prefetch onClick={handleNavigate}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
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
      </SidebarFooter>
    </UISidebar>
  );
};
