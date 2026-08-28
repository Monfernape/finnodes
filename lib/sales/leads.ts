import { SalesLead, SalesLeadStatus, SalesLeadUpdate } from "@/entities";
import { isClosedStatus } from "./constants";
import { FollowUpState, getFollowUp, getSalesToday } from "./dates";

/** The newest update on a lead, reduced to what a list card shows. */
export type LastTouch = {
  happenedOn: string;
  note: string;
  authorEmail: string;
};

export const sortUpdatesByRecency = (updates: SalesLeadUpdate[]) =>
  [...updates].sort(
    (a, b) => b.happened_on.localeCompare(a.happened_on) || b.id - a.id
  );

export const getLastTouch = (updates: SalesLeadUpdate[]) =>
  sortUpdatesByRecency(updates)[0] || null;

type TouchInput = Pick<
  SalesLeadUpdate,
  "id" | "lead_id" | "happened_on" | "note" | "author_email"
>;

/**
 * The newest update per lead, reduced to what a card shows.
 *
 * Deliberately does not assume the rows arrive in any particular order: they
 * are read in pages ordered by id so the paging windows line up, which is not
 * the same as newest first. Later day wins; a tie on the day goes to whichever
 * was written last.
 */
export const indexLastTouches = (updates: TouchInput[]) => {
  const byLeadId: Record<number, TouchInput> = {};

  updates.forEach((update) => {
    const held = byLeadId[update.lead_id];
    const isNewer =
      !held ||
      update.happened_on > held.happened_on ||
      (update.happened_on === held.happened_on && update.id > held.id);

    if (isNewer) {
      byLeadId[update.lead_id] = update;
    }
  });

  const lastTouches: Record<number, LastTouch> = {};
  Object.keys(byLeadId).forEach((leadId) => {
    const update = byLeadId[Number(leadId)];
    lastTouches[update.lead_id] = {
      happenedOn: update.happened_on,
      note: update.note,
      authorEmail: update.author_email,
    };
  });

  return lastTouches;
};

// Overdue first, then today, then everything scheduled, then the rest. Within
// a group the older date leads, because it has been waiting longest.
const FOLLOW_UP_RANK: Record<FollowUpState, number> = {
  [FollowUpState.Overdue]: 0,
  [FollowUpState.Today]: 1,
  [FollowUpState.Upcoming]: 2,
  [FollowUpState.None]: 3,
};

export const sortLeadsByUrgency = (
  leads: SalesLead[],
  today = getSalesToday()
) =>
  [...leads].sort((a, b) => {
    const followUpA = getFollowUp(a, today);
    const followUpB = getFollowUp(b, today);
    const rank =
      FOLLOW_UP_RANK[followUpA.state] - FOLLOW_UP_RANK[followUpB.state];
    if (rank !== 0) {
      return rank;
    }

    if (a.next_follow_up_on && b.next_follow_up_on) {
      const byDate = a.next_follow_up_on.localeCompare(b.next_follow_up_on);
      if (byDate !== 0) {
        return byDate;
      }
    }

    return a.company.localeCompare(b.company);
  });

export const matchesLeadSearch = (lead: SalesLead, search: string) => {
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [
    lead.company,
    lead.contact_name,
    lead.contact_role,
    lead.phone,
    lead.email,
    lead.source,
    lead.owner_email,
    lead.notes,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
};

export type SalesSummary = {
  open: number;
  due: number;
  overdue: number;
  unscheduled: number;
  won: number;
};

/** The counts the list header leads with: what is owed today, and what is adrift. */
export const summariseLeads = (
  leads: SalesLead[],
  today = getSalesToday()
): SalesSummary =>
  leads.reduce<SalesSummary>(
    (summary, lead) => {
      if (isClosedStatus(lead.status)) {
        if (lead.status === SalesLeadStatus.Won) {
          summary.won += 1;
        }
        return summary;
      }

      summary.open += 1;
      const { state } = getFollowUp(lead, today);
      if (state === FollowUpState.Overdue) {
        summary.overdue += 1;
        summary.due += 1;
      }
      if (state === FollowUpState.Today) {
        summary.due += 1;
      }
      // An open lead nobody has given a next date is the one that quietly goes
      // cold, so it is counted rather than left to be noticed.
      if (state === FollowUpState.None) {
        summary.unscheduled += 1;
      }

      return summary;
    },
    { open: 0, due: 0, overdue: 0, unscheduled: 0, won: 0 }
  );
