"use client";

import { useState, type ReactNode } from "react";
import { EyeIcon, PencilLineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ReviewMode = "preview" | "edit";

type ReviewModeSwitcherProps = {
  preview: ReactNode;
  children: ReactNode;
};

export function ReviewModeSwitcher({
  preview,
  children,
}: ReviewModeSwitcherProps) {
  const [mode, setMode] = useState<ReviewMode>("preview");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div
          className="grid w-full grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto"
          role="group"
          aria-label="Review display mode"
        >
          <Button
            type="button"
            variant={mode === "preview" ? "default" : "ghost"}
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className="gap-2 rounded-lg shadow-none sm:min-w-28"
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            Preview
          </Button>
          <Button
            type="button"
            variant={mode === "edit" ? "default" : "ghost"}
            onClick={() => setMode("edit")}
            aria-pressed={mode === "edit"}
            className="gap-2 rounded-lg shadow-none sm:min-w-28"
          >
            <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>
      {mode === "preview" ? preview : children}
    </div>
  );
}
