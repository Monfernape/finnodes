import { beforeEach, describe, expect, it } from "vitest";

import { SalesLeadStatus } from "@/entities";
import {
  getLastTouch,
  indexLastTouches,
  matchesLeadSearch,
  sortLeadsByUrgency,
  sortUpdatesByRecency,
  summariseLeads,
} from "./leads";
import { buildLead, buildUpdate, resetFixtureIds } from "./test-fixtures";

const TODAY = "2026-08-26";

beforeEach(resetFixtureIds);

describe("sortLeadsByUrgency", () => {
  it("puts the day's work first: overdue, then today, then scheduled, then the rest", () => {
    const leads = [
      buildLead({ company: "Upcoming", next_follow_up_on: "2026-09-10" }),
      buildLead({ company: "No date" }),
      buildLead({ company: "Overdue", next_follow_up_on: "2026-08-20" }),
      buildLead({ company: "Today", next_follow_up_on: TODAY }),
      buildLead({
        company: "Won",
        status: SalesLeadStatus.Won,
        next_follow_up_on: "2026-08-01",
      }),
    ];

    expect(sortLeadsByUrgency(leads, TODAY).map((lead) => lead.company)).toEqual([
      "Overdue",
      "Today",
      "Upcoming",
      "No date",
      "Won",
    ]);
  });

  it("puts the longest-waiting overdue lead at the top", () => {
    const leads = [
      buildLead({ company: "Two days", next_follow_up_on: "2026-08-24" }),
      buildLead({ company: "Six days", next_follow_up_on: "2026-08-20" }),
    ];

    expect(sortLeadsByUrgency(leads, TODAY).map((lead) => lead.company)).toEqual([
      "Six days",
      "Two days",
    ]);
  });

  it("falls back to company name so the order never wobbles between renders", () => {
    const leads = [
      buildLead({ company: "Zeta", next_follow_up_on: TODAY }),
      buildLead({ company: "Alpha", next_follow_up_on: TODAY }),
    ];

    expect(sortLeadsByUrgency(leads, TODAY).map((lead) => lead.company)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  it("does not mutate what it was given", () => {
    const leads = [
      buildLead({ company: "Zeta" }),
      buildLead({ company: "Alpha" }),
    ];
    const order = leads.map((lead) => lead.company);

    sortLeadsByUrgency(leads, TODAY);

    expect(leads.map((lead) => lead.company)).toEqual(order);
  });
});

describe("matchesLeadSearch", () => {
  const lead = buildLead({
    company: "Acme Foods",
    contact_name: "Sara",
    contact_role: "Head of Product",
    phone: "+92 300 1234567",
    email: "sara@acme.com",
    source: "Gulberg expo",
    notes: "Wants their portal rebuilt",
  });

  it.each([
    ["company", "acme"],
    ["contact", "sara"],
    ["role", "head of"],
    ["phone", "1234567"],
    ["email", "@acme.com"],
    ["source", "expo"],
    ["notes", "rebuilt"],
  ])("matches on %s", (_field, term) => {
    expect(matchesLeadSearch(lead, term)).toBe(true);
  });

  it("ignores case", () => {
    expect(matchesLeadSearch(lead, "ACME")).toBe(true);
  });

  it("matches everything on an empty search", () => {
    expect(matchesLeadSearch(lead, "   ")).toBe(true);
  });

  it("does not match what is not there", () => {
    expect(matchesLeadSearch(lead, "cement")).toBe(false);
  });
});

describe("summariseLeads", () => {
  it("counts what is owed, what is adrift, and what is done", () => {
    const leads = [
      buildLead({ next_follow_up_on: "2026-08-20" }),
      buildLead({ next_follow_up_on: "2026-08-24" }),
      buildLead({ next_follow_up_on: TODAY }),
      buildLead({ next_follow_up_on: "2026-09-10" }),
      buildLead(),
      buildLead({ status: SalesLeadStatus.Won }),
      buildLead({ status: SalesLeadStatus.Lost }),
    ];

    expect(summariseLeads(leads, TODAY)).toEqual({
      open: 5,
      due: 3,
      overdue: 2,
      unscheduled: 1,
      won: 1,
    });
  });

  it("counts overdue leads as due, since they are today's work too", () => {
    const leads = [buildLead({ next_follow_up_on: "2026-08-01" })];
    const summary = summariseLeads(leads, TODAY);

    expect(summary.overdue).toBe(1);
    expect(summary.due).toBe(1);
  });

  it("does not count a closed lead as open, whatever date it carries", () => {
    const leads = [
      buildLead({ status: SalesLeadStatus.Lost, next_follow_up_on: "2026-08-01" }),
    ];

    expect(summariseLeads(leads, TODAY)).toEqual({
      open: 0,
      due: 0,
      overdue: 0,
      unscheduled: 0,
      won: 0,
    });
  });

  it("counts nothing for an empty list", () => {
    expect(summariseLeads([], TODAY)).toEqual({
      open: 0,
      due: 0,
      overdue: 0,
      unscheduled: 0,
      won: 0,
    });
  });
});

describe("sortUpdatesByRecency", () => {
  it("reads newest first", () => {
    const updates = [
      buildUpdate({ happened_on: "2026-08-01", note: "first" }),
      buildUpdate({ happened_on: "2026-08-20", note: "last" }),
      buildUpdate({ happened_on: "2026-08-10", note: "middle" }),
    ];

    expect(sortUpdatesByRecency(updates).map((update) => update.note)).toEqual([
      "last",
      "middle",
      "first",
    ]);
  });

  it("breaks a same-day tie by which was written last", () => {
    const updates = [
      buildUpdate({ id: 1, happened_on: "2026-08-20", note: "morning" }),
      buildUpdate({ id: 2, happened_on: "2026-08-20", note: "afternoon" }),
    ];

    expect(sortUpdatesByRecency(updates)[0].note).toBe("afternoon");
  });

  it("finds the last touch, or nothing at all", () => {
    expect(getLastTouch([])).toBeNull();
    expect(
      getLastTouch([
        buildUpdate({ happened_on: "2026-08-01", note: "old" }),
        buildUpdate({ happened_on: "2026-08-25", note: "new" }),
      ])?.note
    ).toBe("new");
  });
});

describe("indexLastTouches", () => {
  it("keeps the newest update for each lead", () => {
    const touches = [
      buildUpdate({ id: 1, lead_id: 10, happened_on: "2026-08-01", note: "old" }),
      buildUpdate({ id: 2, lead_id: 10, happened_on: "2026-08-20", note: "new" }),
      buildUpdate({ id: 3, lead_id: 11, happened_on: "2026-08-05", note: "other" }),
    ];

    const indexed = indexLastTouches(touches);

    expect(indexed[10].note).toBe("new");
    expect(indexed[11].note).toBe("other");
  });

  it("does not depend on the order the rows arrive in", () => {
    // Rows are read in pages ordered by id, which is not newest-first.
    const ascending = [
      buildUpdate({ id: 1, lead_id: 10, happened_on: "2026-08-20", note: "newest" }),
      buildUpdate({ id: 2, lead_id: 10, happened_on: "2026-08-01", note: "older" }),
    ];

    expect(indexLastTouches(ascending)[10].note).toBe("newest");
    expect(indexLastTouches([...ascending].reverse())[10].note).toBe("newest");
  });

  it("breaks a same-day tie by whichever was written last", () => {
    const touches = [
      buildUpdate({ id: 7, lead_id: 10, happened_on: "2026-08-20", note: "morning" }),
      buildUpdate({ id: 8, lead_id: 10, happened_on: "2026-08-20", note: "afternoon" }),
    ];

    expect(indexLastTouches(touches)[10].note).toBe("afternoon");
  });

  it("indexes nothing when there is nothing", () => {
    expect(indexLastTouches([])).toEqual({});
  });
});
