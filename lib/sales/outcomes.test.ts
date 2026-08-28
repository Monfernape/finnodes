import { describe, expect, it } from "vitest";

import { SalesLeadStatus } from "@/entities";
import { isClosedStatus } from "./constants";
import { shiftSalesDay } from "./dates";
import {
  DEFAULT_FOLLOW_UP_DAYS,
  LEAD_OUTCOMES,
  getOutcome,
  getOutcomeFollowUp,
} from "./outcomes";

describe("LEAD_OUTCOMES", () => {
  it("gives every button a unique id", () => {
    const ids = LEAD_OUTCOMES.map((outcome) => outcome.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only lands a lead on a status the database allows", () => {
    const allowed = Object.values(SalesLeadStatus);
    LEAD_OUTCOMES.forEach((outcome) => {
      expect(allowed).toContain(outcome.status);
    });
  });

  it("covers every status a call can move a lead to", () => {
    // New is the only one missing on purpose: nothing moves a lead back to
    // never-been-tried. If a status is added, it needs a button or a reason.
    const reachable = Array.from(
      new Set(LEAD_OUTCOMES.map((outcome) => outcome.status))
    );
    const expected = Object.values(SalesLeadStatus).filter(
      (status) => status !== SalesLeadStatus.New
    );

    expect(reachable.sort()).toEqual(expected.sort());
  });

  it("asks for no follow-up date on anything that ends the chase", () => {
    LEAD_OUTCOMES.filter((outcome) => isClosedStatus(outcome.status)).forEach(
      (outcome) => {
        expect(outcome.followUp).toBeNull();
      }
    );
  });

  it("schedules a follow-up for everything that does not", () => {
    LEAD_OUTCOMES.filter(
      (outcome) =>
        !isClosedStatus(outcome.status) &&
        outcome.status !== SalesLeadStatus.Meeting
    ).forEach((outcome) => {
      expect(outcome.followUp).not.toBeNull();
    });
  });

  it("leaves a booked meeting's date to the person, since they know it", () => {
    const meeting = getOutcome("meeting");
    expect(meeting?.status).toBe(SalesLeadStatus.Meeting);
    expect(meeting?.followUp).toBeNull();
  });

  it("carries a note for every button, so history is never blank", () => {
    LEAD_OUTCOMES.forEach((outcome) => {
      expect(outcome.defaultNote.trim()).not.toBe("");
      expect(outcome.label.trim()).not.toBe("");
    });
  });

  it("uses the strategy's own gap where the strategy should decide", () => {
    expect(getOutcome("no-answer")?.followUp).toBe("strategy");
    expect(getOutcome("spoke")?.followUp).toBe("strategy");
  });
});

describe("getOutcome", () => {
  it("finds a button by id", () => {
    expect(getOutcome("won")?.status).toBe(SalesLeadStatus.Won);
  });

  it("returns nothing for an unknown id or none at all", () => {
    expect(getOutcome("nonsense")).toBeNull();
    expect(getOutcome(null)).toBeNull();
  });
});

describe("getOutcomeFollowUp", () => {
  const strategy = { follow_up_after_days: 5 };

  it("uses the strategy's own gap when the outcome defers to it", () => {
    expect(getOutcomeFollowUp(getOutcome("spoke"), strategy, "2026-08-26")).toBe(
      "2026-08-31"
    );
  });

  it("falls back to a sensible gap when the strategy has none", () => {
    expect(
      getOutcomeFollowUp(getOutcome("spoke"), { follow_up_after_days: 0 }, "2026-08-26")
    ).toBe(shiftSalesDay("2026-08-26", DEFAULT_FOLLOW_UP_DAYS));
  });

  it("falls back the same way when the lead has no strategy at all", () => {
    expect(getOutcomeFollowUp(getOutcome("no-answer"), null, "2026-08-26")).toBe(
      shiftSalesDay("2026-08-26", DEFAULT_FOLLOW_UP_DAYS)
    );
  });

  it("uses the outcome's own gap where it sets one", () => {
    // A quote waits a week regardless of what the call strategy says.
    expect(getOutcomeFollowUp(getOutcome("quoted"), strategy, "2026-08-26")).toBe(
      "2026-09-02"
    );
  });

  it.each(["won", "lost", "meeting"])(
    "leaves %s with no date",
    (outcomeId) => {
      expect(getOutcomeFollowUp(getOutcome(outcomeId), strategy, "2026-08-26")).toBeNull();
    }
  );

  it("returns nothing when no outcome was picked", () => {
    expect(getOutcomeFollowUp(null, strategy, "2026-08-26")).toBeNull();
  });

  it("counts from the day the call happened, not from today", () => {
    expect(getOutcomeFollowUp(getOutcome("quoted"), strategy, "2026-08-01")).toBe(
      "2026-08-08"
    );
  });
});
