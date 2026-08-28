import { SalesLead, SalesStrategy } from "@/entities";
import { addDays, diffInDays } from "@/lib/announcements";
import { isClosedStatus } from "./constants";

const APP_TIME_ZONE = "Asia/Karachi";

// en-CA formats as YYYY-MM-DD, which is the shape every date column here uses.
const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Today as the office reckons it. A follow-up is due on a day in Karachi, not
 * at an instant, so the browser's own zone is deliberately not consulted: a
 * manager checking the list from abroad still sees the same day's work.
 */
export const getSalesToday = (now = new Date()) => todayFormatter.format(now);

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isSalesDay = (day: string | null): day is string =>
  Boolean(day && DAY_PATTERN.test(day));

/** Formats a plain date column without letting the browser's zone shift it. */
export const formatSalesDay = (day: string | null) => {
  if (!isSalesDay(day)) {
    return "";
  }
  const [year, month, date] = day.split("-").map(Number);
  return dayFormatter.format(new Date(Date.UTC(year, month - 1, date)));
};

/**
 * Rebuilds a date column at local midnight for the calendar control. A day on
 * a calendar is not an instant: `new Date("2026-08-26")` is midnight UTC,
 * which reads as the 25th anywhere behind it.
 */
export const parseSalesDay = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
};

export enum FollowUpState {
  /** The date has passed and nobody has logged anything since. */
  Overdue = "overdue",
  Today = "today",
  Upcoming = "upcoming",
  /** Nothing scheduled: either closed, or waiting on somebody to decide. */
  None = "none",
}

export type FollowUp = {
  state: FollowUpState;
  /** Negative when overdue. Zero for both today and nothing scheduled. */
  daysUntil: number;
};

export const getFollowUp = (
  lead: Pick<SalesLead, "next_follow_up_on" | "status">,
  today = getSalesToday()
): FollowUp => {
  // A won or lost lead is not waiting on anyone, so a date left behind on it
  // never reads as work outstanding.
  if (!isSalesDay(lead.next_follow_up_on) || isClosedStatus(lead.status)) {
    return { state: FollowUpState.None, daysUntil: 0 };
  }

  const daysUntil = diffInDays(today, lead.next_follow_up_on);
  if (daysUntil < 0) {
    return { state: FollowUpState.Overdue, daysUntil };
  }
  if (daysUntil === 0) {
    return { state: FollowUpState.Today, daysUntil };
  }
  return { state: FollowUpState.Upcoming, daysUntil };
};

/** "3 days late", "Today", "in 5 days" — the one line a card leads with. */
export const formatFollowUp = (followUp: FollowUp) => {
  switch (followUp.state) {
    case FollowUpState.Overdue: {
      const days = Math.abs(followUp.daysUntil);
      return days === 1 ? "1 day late" : `${days} days late`;
    }
    case FollowUpState.Today:
      return "Today";
    case FollowUpState.Upcoming:
      return followUp.daysUntil === 1
        ? "Tomorrow"
        : `in ${followUp.daysUntil} days`;
    default:
      return "No date set";
  }
};

/**
 * The date a strategy's plan points at, counted from the day the touch happened
 * rather than from today, so typing up yesterday's calls does not quietly push
 * every follow-up a day out. A strategy with no gap set, or no strategy at all,
 * leaves the date to whoever is updating the lead.
 */
export const getSuggestedFollowUp = (
  strategy: Pick<SalesStrategy, "follow_up_after_days"> | null,
  happenedOn: string
) => {
  if (!strategy || strategy.follow_up_after_days <= 0) {
    return null;
  }
  return addDays(happenedOn, strategy.follow_up_after_days);
};

export type FollowUpChoice = {
  label: string;
  days: number;
};

/**
 * The one-tap dates on the update form. Typing a date into a calendar is the
 * slowest thing on the page and the answer is nearly always one of these.
 */
export const FOLLOW_UP_CHOICES: FollowUpChoice[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export const shiftSalesDay = (day: string, days: number) => addDays(day, days);
