"use client";
import { useToolbar } from "@/hooks/useToolbar";
import Link from "next/link";
import React from "react";

export const PageTitle = () => {
  const toolbarMetaData = useToolbar();
  const { title, backRoute, addRoute } = toolbarMetaData || {};
  return (
    <header className="flex h-28 justify-between border-b">
      {backRoute && (
        <Link
          href={backRoute}
          className="flex items-center pl-4 text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>
      )}
      <h1 className="font-semibold text-center w-full text-base md:text-xl lg:text-2xl">
        {title}
      </h1>
      {addRoute && (
        <Link href={addRoute}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </Link>
      )}
    </header>
  );
};
