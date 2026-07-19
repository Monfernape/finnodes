import { EMPTY_TIPTAP_DOC, OneOnOneStatus, type TiptapDoc } from "@/entities";
import type { JSONContent } from "@tiptap/core";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const getCurrentYear = () => new Date().getFullYear();

export const getMonthName = (month: number) => MONTHS[month - 1] ?? `Month ${month}`;

export const getOneOnOneStatusLabel = (
  status: OneOnOneStatus | null | undefined,
) => {
  if (status === OneOnOneStatus.Completed) {
    return "Complete";
  }

  if (status === OneOnOneStatus.Draft) {
    return "In progress";
  }

  return "Not started";
};

export const parseRouteNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isJsonContent = (value: unknown): value is JSONContent => {
  if (!isRecord(value)) return false;

  if ("type" in value && typeof value.type !== "string") return false;
  if ("text" in value && typeof value.text !== "string") return false;
  if ("content" in value) {
    if (!Array.isArray(value.content)) return false;
    return value.content.every(isJsonContent);
  }

  return true;
};

export const normalizeTiptapDoc = (value: unknown): TiptapDoc => {
  if (
    isRecord(value) &&
    "type" in value &&
    value.type === "doc"
  ) {
    return {
      type: "doc",
      content:
        "content" in value && Array.isArray(value.content)
          ? value.content.filter(isJsonContent)
          : [],
    };
  }

  return EMPTY_TIPTAP_DOC;
};

export const SELF_REVIEW_PROMPTS = [
  "What went well?",
  "What did not go well?",
  "What do I want to be more involved in?",
  "What support do I need?",
];

export const MANAGER_REVIEW_PROMPTS = [
  "Strengths and impact",
  "Growth areas",
  "Expectations for next cycle",
  "Support or opportunities the manager will provide",
];

export const MANAGER_FEEDBACK_PROMPTS = [
  "What is my manager doing well?",
  "What could my manager improve?",
  "What do I need from my manager to be successful?",
];

export const PEER_FEEDBACK_PROMPTS = [
  "What went well?",
  "What could have gone better?",
  "How could this person grow further?",
];
