import type { JSONContent } from "@tiptap/core";

import { TiptapDoc } from "@/entities";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "September 2026", the way the reminder names the 1:1 it is about. */
export const formatOneOnOnePeriod = (year: number, month: number) =>
  MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));

export const getCurrentOneOnOnePeriod = (today = new Date()) => ({
  year: today.getUTCFullYear(),
  month: today.getUTCMonth() + 1,
});

const nodesHaveText = (nodes: JSONContent[]): boolean =>
  nodes.some((node) => {
    if (typeof node.text === "string" && node.text.trim().length > 0) {
      return true;
    }
    return Array.isArray(node.content) ? nodesHaveText(node.content) : false;
  });

/**
 * Whether an agenda is genuinely blank.
 *
 * Checks for text rather than for nodes: an editor that has been opened and
 * closed again leaves an empty paragraph behind, and a checklist with no
 * wording in it is still nothing to talk about.
 */
export const isAgendaEmpty = (agenda: TiptapDoc | null | undefined) => {
  if (!agenda || !Array.isArray(agenda.content)) {
    return true;
  }
  return !nodesHaveText(agenda.content);
};
