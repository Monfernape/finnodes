import { describe, expect, it } from "vitest";

import { SalesLeadStatus } from "@/entities";
import {
  FOLLOW_UP_CHOICES,
  FollowUpState,
  formatFollowUp,
  formatSalesDay,
  getFollowUp,
  getSalesToday,
  getSuggestedFollowUp,
  isSalesDay,
  parseSalesDay,
  shiftSalesDay,
} from "./dates";
import { buildLead, buildStrategy } from "./test-fixtures";

const TODAY = "2026-08-26";

describe("getSalesToday", () => {
  it("reports the Karachi day, not the machine's", () => {
    // 21:00 UTC is already tomorrow in Karachi (+05) and still today in
    // New York. The office day has to win either way.
    const evening = new Date("2026-08-26T21:00:00Z");
    expect(getSalesToday(evening)).toBe("2026-08-27");
  });

  it("does not roll over early", () => {
    const morning = new Date("2026-08-26T06:00:00Z");
    expect(getSalesToday(morning)).toBe("2026-08-26");
  });

  it("formats as a plain date column", () => {
    expect(getSalesToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isSalesDay", () => {
  it.each([
    ["2026-08-26", true],
    ["2026-8-26", false],
    ["26-08-2026", false],
    ["", false],
    [null, false],
  ])("%s -> %s", (value, expected) => {
    expect(isSalesDay(value)).toBe(expected);
  });
});

describe("formatSalesDay", () => {
  it("formats without letting a timezone shift the day", () => {
    expect(formatSalesDay("2026-08-26")).toBe("26 Aug 2026");
    expect(formatSalesDay("2026-01-01")).toBe("1 Jan 2026");
    expect(formatSalesDay("2026-12-31")).toBe("31 Dec 2026");
  });

  it("returns nothing for anything that is not a date column", () => {
    expect(formatSalesDay(null)).toBe("");
    expect(formatSalesDay("")).toBe("");
    expect(formatSalesDay("not-a-date")).toBe("");
  });
});

describe("parseSalesDay", () => {
  it("rebuilds the same calendar day at local midnight", () => {
    const parsed = parseSalesDay("2026-08-26");
    expect([parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()]).toEqual([
      2026, 8, 26,
    ]);
    expect(parsed.getHours()).toBe(0);
  });

  it("round-trips through shiftSalesDay", () => {
    const shifted = shiftSalesDay("2026-08-26", 0);
    expect(shifted).toBe("2026-08-26");
  });
});

describe("getFollowUp", () => {
  it("reads a date in the past as overdue, counting the days", () => {
    const lead = buildLead({ next_follow_up_on: "2026-08-24" });
    expect(getFollowUp(lead, TODAY)).toEqual({
      state: FollowUpState.Overdue,
      daysUntil: -2,
    });
  });

  it("reads today as due today", () => {
    const lead = buildLead({ next_follow_up_on: TODAY });
    expect(getFollowUp(lead, TODAY)).toEqual({
      state: FollowUpState.Today,
      daysUntil: 0,
    });
  });

  it("reads a future date as upcoming", () => {
    const lead = buildLead({ next_follow_up_on: "2026-08-29" });
    expect(getFollowUp(lead, TODAY)).toEqual({
      state: FollowUpState.Upcoming,
      daysUntil: 3,
    });
  });

  it("reads no date as nothing scheduled", () => {
    expect(getFollowUp(buildLead(), TODAY).state).toBe(FollowUpState.None);
  });

  it.each([SalesLeadStatus.Won, SalesLeadStatus.Lost])(
    "ignores a date left behind on a %s lead",
    (status) => {
      const lead = buildLead({ status, next_follow_up_on: "2026-01-01" });
      expect(getFollowUp(lead, TODAY)).toEqual({
        state: FollowUpState.None,
        daysUntil: 0,
      });
    }
  );

  it("ignores a malformed date rather than reporting nonsense days", () => {
    const lead = buildLead({ next_follow_up_on: "26/08/2026" });
    expect(getFollowUp(lead, TODAY).state).toBe(FollowUpState.None);
  });

  it.each([
    ["across a month end", "2026-08-31", "2026-09-01", 1],
    ["across a year end", "2026-12-31", "2027-01-01", 1],
    ["across a leap day", "2028-02-28", "2028-03-01", 2],
  ])("counts days %s", (_label, today, followUpOn, expected) => {
    const lead = buildLead({ next_follow_up_on: followUpOn });
    expect(getFollowUp(lead, today).daysUntil).toBe(expected);
  });
});

describe("formatFollowUp", () => {
  it.each([
    [{ state: FollowUpState.Overdue, daysUntil: -1 }, "1 day late"],
    [{ state: FollowUpState.Overdue, daysUntil: -5 }, "5 days late"],
    [{ state: FollowUpState.Today, daysUntil: 0 }, "Today"],
    [{ state: FollowUpState.Upcoming, daysUntil: 1 }, "Tomorrow"],
    [{ state: FollowUpState.Upcoming, daysUntil: 4 }, "in 4 days"],
    [{ state: FollowUpState.None, daysUntil: 0 }, "No date set"],
  ])("%o reads as %s", (followUp, expected) => {
    expect(formatFollowUp(followUp)).toBe(expected);
  });
});

describe("getSuggestedFollowUp", () => {
  it("counts from the day the call happened, not from today", () => {
    // Typing up Monday's calls on Wednesday must not push the follow-up out.
    const strategy = buildStrategy({ follow_up_after_days: 3 });
    expect(getSuggestedFollowUp(strategy, "2026-08-24")).toBe("2026-08-27");
  });

  it("crosses a month end", () => {
    const strategy = buildStrategy({ follow_up_after_days: 7 });
    expect(getSuggestedFollowUp(strategy, "2026-08-28")).toBe("2026-09-04");
  });

  it("suggests nothing when the strategy sets no gap", () => {
    const strategy = buildStrategy({ follow_up_after_days: 0 });
    expect(getSuggestedFollowUp(strategy, TODAY)).toBeNull();
  });

  it("suggests nothing without a strategy", () => {
    expect(getSuggestedFollowUp(null, TODAY)).toBeNull();
  });
});

describe("FOLLOW_UP_CHOICES", () => {
  it("offers a rising set of future days", () => {
    const days = FOLLOW_UP_CHOICES.map((choice) => choice.days);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(Math.min(...days)).toBeGreaterThan(0);
  });
});
