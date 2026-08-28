import { SalesLeadStatus, SalesStrategy } from "@/entities";
import { getSuggestedFollowUp, shiftSalesDay } from "./dates";

/**
 * The six things that actually happen on a call, as one-tap buttons.
 *
 * Logging a call used to mean a note, a status picker and a date picker. Nearly
 * every call is one of these six, and each one already implies the status and
 * roughly when to try again — so the common case becomes one tap, and the
 * fields below it are left for the times it is not.
 */
export type LeadOutcome = {
  id: string;
  label: string;
  /** Where the lead lands. */
  status: SalesLeadStatus;
  /**
   * When to come back: a number of days, `"strategy"` to use the strategy's own
   * gap, or null to leave the lead with no date (which is right for won, lost,
   * and for a meeting whose date the person will type in themselves).
   */
  followUp: number | "strategy" | null;
  /** Saved as the note when nobody types one, so history is never blank. */
  defaultNote: string;
};

export const LEAD_OUTCOMES: LeadOutcome[] = [
  {
    id: "no-answer",
    label: "No answer",
    status: SalesLeadStatus.Contacted,
    followUp: "strategy",
    defaultNote: "No answer.",
  },
  {
    id: "spoke",
    label: "Spoke to them",
    status: SalesLeadStatus.FollowingUp,
    followUp: "strategy",
    defaultNote: "Spoke to them, worth going back.",
  },
  {
    id: "meeting",
    label: "Meeting booked",
    status: SalesLeadStatus.Meeting,
    followUp: null,
    defaultNote: "Meeting booked.",
  },
  {
    id: "quoted",
    label: "Sent a quote",
    status: SalesLeadStatus.Proposal,
    // A week is the usual wait on a quote before it is polite to chase.
    followUp: 7,
    defaultNote: "Sent them our numbers.",
  },
  {
    id: "won",
    label: "They signed",
    status: SalesLeadStatus.Won,
    followUp: null,
    defaultNote: "They signed.",
  },
  {
    id: "lost",
    label: "Not interested",
    status: SalesLeadStatus.Lost,
    followUp: null,
    defaultNote: "Not interested.",
  },
];

export const getOutcome = (outcomeId: string | null) =>
  LEAD_OUTCOMES.find((outcome) => outcome.id === outcomeId) || null;

/**
 * Days to fall back on when an outcome defers to the strategy and the strategy
 * has nothing to say — no strategy on the lead, or one with no gap set.
 */
export const DEFAULT_FOLLOW_UP_DAYS = 3;

/**
 * The follow-up date an outcome implies. Null means the outcome deliberately
 * leaves the lead with no date: won and lost are not waiting on anyone, and a
 * booked meeting has a date only the person who booked it knows.
 */
export const getOutcomeFollowUp = (
  outcome: LeadOutcome | null,
  strategy: Pick<SalesStrategy, "follow_up_after_days"> | null,
  happenedOn: string
) => {
  if (!outcome || outcome.followUp === null) {
    return null;
  }

  if (outcome.followUp === "strategy") {
    return (
      getSuggestedFollowUp(strategy, happenedOn) ||
      shiftSalesDay(happenedOn, DEFAULT_FOLLOW_UP_DAYS)
    );
  }

  return shiftSalesDay(happenedOn, outcome.followUp);
};
