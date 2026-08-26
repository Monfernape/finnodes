"use client";

import * as React from "react";
import { AnnouncementTemplate } from "@/entities";
import {
  AnnouncementFill,
  composeAnnouncementMessage,
  getTemplateTokens,
  hasUnfilledTokens,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";

type Props = {
  template: Pick<AnnouncementTemplate, "title" | "emoji" | "body">;
  fill: AnnouncementFill;
  className?: string;
};

/**
 * Shows the message exactly as it will land on the clipboard, asterisks and
 * all, so there is no gap between what a manager reads here and what their
 * team reads in Slack.
 */
export const AnnouncementPreview = ({ template, fill, className }: Props) => {
  const message = composeAnnouncementMessage(template, fill);
  const unfilled = hasUnfilledTokens(template.body, fill);
  const remaining = getTemplateTokens(message);

  return (
    <div className={cn("space-y-3", className)}>
      {unfilled && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Still to fill in: {remaining.join(", ")}. Fill those in above and the
          message completes itself.
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};
