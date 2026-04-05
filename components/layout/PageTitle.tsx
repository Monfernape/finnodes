"use client";
import { useToolbar } from "@/hooks/useToolbar";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import React from "react";
import { ArrowLeftIcon } from "../icons";

export const PageTitle = () => {
  const toolbarMetaData = useToolbar();
  const { title, backRoute, addRoute } = toolbarMetaData || {};

  useRoutePrefetch([backRoute, addRoute]);

  return (
    <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 dark:border-gray-800">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="h-11 w-11 rounded-full border-gray-200 bg-white/90 shadow-sm backdrop-blur hover:bg-white lg:hidden" />
        {backRoute && (
          <Link
            href={backRoute}
            prefetch
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:hover:bg-gray-800 dark:focus:ring-gray-300"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        )}
        <h1 className="truncate text-[1.75rem] font-semibold leading-none tracking-tight">
          {title}
        </h1>
      </div>
      {addRoute && (
        <Link
          href={addRoute}
          prefetch
          className="inline-flex h-11 items-center justify-center rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus:ring-gray-300"
        >
          Add New
        </Link>
      )}
    </header>
  );
};
