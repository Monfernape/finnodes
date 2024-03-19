'use client'
import { usePageTitle } from "@/hooks/usePageTitle";
import React from "react";

export const PageTitle = () => {
    const pageTitle = usePageTitle()
  return (
    <header className="flex h-28 items-center gap-4 border-b">
      <h1 className="font-semibold text-center w-full text-base md:text-xl lg:text-2xl">
        {pageTitle}
      </h1>
    </header>
  );
};
