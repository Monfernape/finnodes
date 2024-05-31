"use client";
import { useToolbar } from "@/hooks/useToolbar";
import Link from "next/link";
import React from "react";
import { ArrowLeftIcon } from "../icons";

export const PageTitle = () => {
  const toolbarMetaData = useToolbar();
  const { title, backRoute, addRoute } = toolbarMetaData || {};
  return (
    <header className="flex items-center justify-between border-b border-gray-200 py-4 px-6 dark:border-gray-800">
      <div className="flex items-center space-x-4">
        {backRoute && <Link
          href={backRoute}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:hover:bg-gray-800 dark:focus:ring-gray-300"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Link>}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {addRoute && <Link
        href={addRoute}
        className="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus:ring-gray-300"
      >
        Add New
      </Link>}
    </header>
  );
};
