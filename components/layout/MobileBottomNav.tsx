"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";

import { MOBILE_MORE_NAV, MOBILE_PRIMARY_NAV, NAVIGATION_ITEMS, SIGN_OUT_NAV } from "./navigation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useRoutePrefetch(NAVIGATION_ITEMS.map((item) => item.href));

  const isMoreActive = NAVIGATION_ITEMS.some(
    (item) =>
      !MOBILE_PRIMARY_NAV.find((primaryItem) => primaryItem.href === item.href) &&
      pathname === item.href
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <nav className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-[1.5rem] border border-gray-200/80 bg-white/95 px-2 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur">
        {MOBILE_PRIMARY_NAV.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.7rem] font-medium text-gray-500 transition-colors",
                isActive && "bg-gray-900 text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.7rem] font-medium text-gray-500 transition-colors",
                isMoreActive && "bg-gray-900 text-white"
              )}
              aria-label="Open more navigation items"
            >
              <MOBILE_MORE_NAV.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{MOBILE_MORE_NAV.title}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bottom-0 top-auto max-w-none translate-x-[-50%] translate-y-0 rounded-t-[2rem] border-gray-200 px-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:max-w-lg sm:rounded-[2rem]">
            <DialogHeader className="border-b border-gray-100 px-5 pb-4 pt-5 text-left">
              <DialogTitle>More</DialogTitle>
              <DialogDescription>
                Quick access to the rest of FinNodes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 px-3 pt-4">
              {NAVIGATION_ITEMS.filter(
                (item) =>
                  !MOBILE_PRIMARY_NAV.find(
                    (primaryItem) => primaryItem.href === item.href
                  )
              ).map((item) => {
                const isActive = pathname === item.href;

                return (
                  <DialogClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950",
                        isActive && "bg-gray-100 text-gray-950"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </DialogClose>
                );
              })}
            </div>
            <div className="px-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-12 w-full justify-start rounded-2xl border-gray-200 px-4 text-sm font-medium"
              >
                <SIGN_OUT_NAV.icon className="mr-3 h-5 w-5" />
                {signingOut ? "Signing out..." : SIGN_OUT_NAV.title}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  );
}
