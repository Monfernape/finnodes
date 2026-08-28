import { beforeEach, describe, expect, it } from "vitest";

import { SalesLeadStatus } from "@/entities";
import {
  MIN_LEADS_FOR_VERDICT,
  StrategyVerdict,
  buildStrategyPerformance,
  formatCadence,
  formatPercent,
  formatStrategyScore,
  getLiveStrategies,
  getPerformance,
  getReachedProgressByLeadId,
  getSelectableStrategies,
  getStrategyById,
  getVerdictMeta,
  isLiveStrategy,
  sortStrategies,
  sortStrategiesByPerformance,
} from "./strategies";
import { buildLead, buildStrategy, buildUpdate, resetFixtureIds } from "./test-fixtures";

beforeEach(resetFixtureIds);

describe("soft delete", () => {
  it("treats a strategy with no deleted_at as live", () => {
    expect(isLiveStrategy(buildStrategy())).toBe(true);
    expect(
      isLiveStrategy(buildStrategy({ deleted_at: "2026-08-26T00:00:00.000Z" }))
    ).toBe(false);
  });

  it("keeps deleted strategies out of the list", () => {
    const live = buildStrategy({ title: "Live" });
    const deleted = buildStrategy({
      title: "Deleted",
      deleted_at: "2026-08-26T00:00:00.000Z",
    });

    expect(getLiveStrategies([live, deleted]).map((s) => s.title)).toEqual([
      "Live",
    ]);
  });

  it("offers only live, un-retired strategies for a new lead", () => {
    const active = buildStrategy({ title: "Active" });
    const retired = buildStrategy({ title: "Retired", is_active: false });
    const deleted = buildStrategy({
      title: "Deleted",
      deleted_at: "2026-08-26T00:00:00.000Z",
    });
    // Retired *and* deleted must not sneak back in through either check.
    const both = buildStrategy({
      title: "Both",
      is_active: false,
      deleted_at: "2026-08-26T00:00:00.000Z",
    });

    expect(
      getSelectableStrategies([active, retired, deleted, both]).map((s) => s.title)
    ).toEqual(["Active"]);
  });

  it("still finds a deleted strategy by id, so old leads keep their name", () => {
    const deleted = buildStrategy({
      title: "Deleted",
      deleted_at: "2026-08-26T00:00:00.000Z",
    });

    expect(getStrategyById([deleted], deleted.id)?.title).toBe("Deleted");
    expect(getStrategyById([deleted], null)).toBeNull();
    expect(getStrategyById([deleted], 999)).toBeNull();
  });
});

describe("sortStrategies", () => {
  it("puts retired ones last, then reads alphabetically", () => {
    const strategies = [
      buildStrategy({ title: "Zeta" }),
      buildStrategy({ title: "Retired", is_active: false }),
      buildStrategy({ title: "Alpha" }),
    ];

    expect(sortStrategies(strategies).map((s) => s.title)).toEqual([
      "Alpha",
      "Zeta",
      "Retired",
    ]);
  });
});

describe("formatCadence", () => {
  it.each([
    [0, "No set gap"],
    [1, "Follow up next day"],
    [3, "Follow up every 3 days"],
  ])("%i days reads as %s", (days, expected) => {
    expect(formatCadence({ follow_up_after_days: days })).toBe(expected);
  });
});

describe("getReachedProgressByLeadId", () => {
  it("starts from the lead's current status", () => {
    const lead = buildLead({ status: SalesLeadStatus.Meeting });
    const reached = getReachedProgressByLeadId([lead], []);

    expect(reached[lead.id]).toBe(3);
  });

  it("remembers the furthest a lead ever got, not where it ended", () => {
    // Talked for a month, then said no. That is still a reply.
    const lead = buildLead({ status: SalesLeadStatus.Lost });
    const updates = [
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Contacted }),
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Meeting }),
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Lost }),
    ];

    expect(getReachedProgressByLeadId([lead], updates)[lead.id]).toBe(3);
  });

  it("leaves a lead that never got a reply at the bottom", () => {
    const lead = buildLead({ status: SalesLeadStatus.Lost });
    const updates = [
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Contacted }),
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Lost }),
    ];

    expect(getReachedProgressByLeadId([lead], updates)[lead.id]).toBe(1);
  });

  it("ignores updates whose lead is not in the set", () => {
    const lead = buildLead({ status: SalesLeadStatus.New });
    const stray = buildUpdate({ lead_id: 9999, status_after: SalesLeadStatus.Won });

    const reached = getReachedProgressByLeadId([lead], [stray]);

    expect(reached[9999]).toBeUndefined();
    expect(reached[lead.id]).toBe(0);
  });

  it("ignores updates that recorded no status move", () => {
    const lead = buildLead({ status: SalesLeadStatus.Contacted });
    const updates = [buildUpdate({ lead_id: lead.id, status_after: null })];

    expect(getReachedProgressByLeadId([lead], updates)[lead.id]).toBe(1);
  });
});

describe("buildStrategyPerformance", () => {
  it("counts the funnel from the furthest each lead reached", () => {
    const strategy = buildStrategy();
    const untouched = buildLead({ strategy_id: strategy.id });
    const tried = buildLead({
      strategy_id: strategy.id,
      status: SalesLeadStatus.Contacted,
    });
    const replied = buildLead({
      strategy_id: strategy.id,
      status: SalesLeadStatus.FollowingUp,
    });
    const met = buildLead({
      strategy_id: strategy.id,
      status: SalesLeadStatus.Meeting,
    });
    const signed = buildLead({
      strategy_id: strategy.id,
      status: SalesLeadStatus.Won,
    });

    const score = buildStrategyPerformance(
      [strategy],
      [untouched, tried, replied, met, signed],
      []
    )[strategy.id];

    expect(score).toMatchObject({
      leads: 5,
      replied: 3,
      meetings: 2,
      quoted: 1,
      won: 1,
      lost: 0,
      open: 4,
    });
  });

  it("credits a reply to a lead that later went cold", () => {
    const strategy = buildStrategy();
    const lead = buildLead({
      strategy_id: strategy.id,
      status: SalesLeadStatus.Lost,
    });
    const updates = [
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.FollowingUp }),
      buildUpdate({ lead_id: lead.id, status_after: SalesLeadStatus.Lost }),
    ];

    const score = buildStrategyPerformance([strategy], [lead], updates)[
      strategy.id
    ];

    expect(score).toMatchObject({ leads: 1, replied: 1, lost: 1, open: 0 });
  });

  it("keeps each strategy's leads to itself", () => {
    const mine = buildStrategy({ title: "Mine" });
    const theirs = buildStrategy({ title: "Theirs" });
    const performance = buildStrategyPerformance(
      [mine, theirs],
      [
        buildLead({ strategy_id: mine.id, status: SalesLeadStatus.Won }),
        buildLead({ strategy_id: theirs.id, status: SalesLeadStatus.Lost }),
      ],
      []
    );

    expect(performance[mine.id]).toMatchObject({ leads: 1, won: 1, lost: 0 });
    expect(performance[theirs.id]).toMatchObject({ leads: 1, won: 0, lost: 1 });
  });

  it("ignores leads with no strategy, and leads pointing somewhere unknown", () => {
    const strategy = buildStrategy();
    const performance = buildStrategyPerformance(
      [strategy],
      [buildLead({ strategy_id: null }), buildLead({ strategy_id: 9999 })],
      []
    );

    expect(performance[strategy.id].leads).toBe(0);
  });

  it("scores every strategy given, even one nobody has used", () => {
    const unused = buildStrategy();
    const performance = buildStrategyPerformance([unused], [], []);

    expect(performance[unused.id]).toMatchObject({
      leads: 0,
      replyRate: 0,
      winRate: 0,
      lastWorkedOn: null,
      verdict: StrategyVerdict.TooEarly,
    });
  });

  it("reports the last day anything was logged against it", () => {
    const strategy = buildStrategy();
    const lead = buildLead({ strategy_id: strategy.id });
    const updates = [
      buildUpdate({ lead_id: lead.id, happened_on: "2026-08-01" }),
      buildUpdate({ lead_id: lead.id, happened_on: "2026-08-20" }),
      buildUpdate({ lead_id: lead.id, happened_on: "2026-08-10" }),
    ];

    expect(
      buildStrategyPerformance([strategy], [lead], updates)[strategy.id]
        .lastWorkedOn
    ).toBe("2026-08-20");
  });

  it("does not credit one strategy with another's activity", () => {
    const mine = buildStrategy();
    const theirs = buildStrategy();
    const myLead = buildLead({ strategy_id: mine.id });
    const theirLead = buildLead({ strategy_id: theirs.id });

    const performance = buildStrategyPerformance(
      [mine, theirs],
      [myLead, theirLead],
      [
        buildUpdate({ lead_id: myLead.id, happened_on: "2026-08-01" }),
        buildUpdate({ lead_id: theirLead.id, happened_on: "2026-08-30" }),
      ]
    );

    expect(performance[mine.id].lastWorkedOn).toBe("2026-08-01");
    expect(performance[theirs.id].lastWorkedOn).toBe("2026-08-30");
  });

  it("works out rates without dividing by nothing", () => {
    const strategy = buildStrategy();
    const leads = [
      buildLead({ strategy_id: strategy.id, status: SalesLeadStatus.FollowingUp }),
      buildLead({ strategy_id: strategy.id, status: SalesLeadStatus.Won }),
      buildLead({ strategy_id: strategy.id }),
      buildLead({ strategy_id: strategy.id }),
    ];

    const score = buildStrategyPerformance([strategy], leads, [])[strategy.id];

    expect(score.replyRate).toBeCloseTo(0.5);
    expect(score.winRate).toBeCloseTo(0.25);
  });
});

describe("the verdict", () => {
  const scoreWith = (leadCount: number, repliedCount: number, wonCount = 0) => {
    const strategy = buildStrategy();
    const leads = Array.from({ length: leadCount }, (_, index) => {
      if (index < wonCount) {
        return buildLead({
          strategy_id: strategy.id,
          status: SalesLeadStatus.Won,
        });
      }
      return buildLead({
        strategy_id: strategy.id,
        status:
          index < repliedCount
            ? SalesLeadStatus.FollowingUp
            : SalesLeadStatus.Contacted,
      });
    });

    return buildStrategyPerformance([strategy], leads, [])[strategy.id];
  };

  it("says nothing until enough leads have been through it", () => {
    // Four leads and one reply is one reply, not a 25% reply rate.
    const score = scoreWith(MIN_LEADS_FOR_VERDICT - 1, 1);
    expect(score.verdict).toBe(StrategyVerdict.TooEarly);
  });

  it("calls a quarter replying working", () => {
    expect(scoreWith(8, 2).verdict).toBe(StrategyVerdict.Working);
  });

  it("calls a signed client working however quiet the replies were", () => {
    // 10 leads, 1 reply, and that reply signed: 10% would read as "mixed"
    // without the win overriding it.
    expect(scoreWith(10, 1, 1).verdict).toBe(StrategyVerdict.Working);
  });

  it("calls a tenth replying mixed", () => {
    expect(scoreWith(10, 1).verdict).toBe(StrategyVerdict.Mixed);
  });

  it("calls near silence not landing", () => {
    expect(scoreWith(20, 1).verdict).toBe(StrategyVerdict.NotLanding);
    expect(scoreWith(10, 0).verdict).toBe(StrategyVerdict.NotLanding);
  });

  it("describes every verdict it can reach", () => {
    Object.values(StrategyVerdict).forEach((verdict) => {
      const meta = getVerdictMeta(verdict);
      expect(meta.verdict).toBe(verdict);
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
    });
  });
});

describe("getPerformance", () => {
  it("returns an empty score for a strategy nobody has scored", () => {
    expect(getPerformance({}, 42)).toMatchObject({
      strategyId: 42,
      leads: 0,
      verdict: StrategyVerdict.TooEarly,
    });
  });
});

describe("saying it in words", () => {
  it("puts the whole story on one line", () => {
    const strategy = buildStrategy();
    const score = buildStrategyPerformance(
      [strategy],
      [
        buildLead({ strategy_id: strategy.id, status: SalesLeadStatus.Won }),
        buildLead({ strategy_id: strategy.id, status: SalesLeadStatus.FollowingUp }),
      ],
      []
    )[strategy.id];

    expect(formatStrategyScore(score)).toBe("2 leads · 2 replied · 1 won");
  });

  it("says so when nothing has used it", () => {
    expect(
      formatStrategyScore({ ...getPerformance({}, 1), leads: 0 })
    ).toBe("No leads yet");
  });

  it("counts one lead in the singular", () => {
    const strategy = buildStrategy();
    const score = buildStrategyPerformance(
      [strategy],
      [buildLead({ strategy_id: strategy.id })],
      []
    )[strategy.id];

    expect(formatStrategyScore(score)).toContain("1 lead ·");
  });

  it.each([
    [0, "0%"],
    [0.25, "25%"],
    [0.333, "33%"],
    [1, "100%"],
  ])("formats %f as %s", (rate, expected) => {
    expect(formatPercent(rate)).toBe(expected);
  });
});

describe("sortStrategiesByPerformance", () => {
  it("puts what is proven above what is untried, and wins above replies", () => {
    const winner = buildStrategy({ title: "Winner" });
    const replies = buildStrategy({ title: "Replies" });
    const untried = buildStrategy({ title: "Untried" });

    const leads = [
      ...Array.from({ length: 6 }, (_, index) =>
        buildLead({
          strategy_id: winner.id,
          status: index === 0 ? SalesLeadStatus.Won : SalesLeadStatus.Contacted,
        })
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        buildLead({
          strategy_id: replies.id,
          status:
            index < 3 ? SalesLeadStatus.FollowingUp : SalesLeadStatus.Contacted,
        })
      ),
      buildLead({ strategy_id: untried.id }),
    ];

    const performance = buildStrategyPerformance(
      [winner, replies, untried],
      leads,
      []
    );

    expect(
      sortStrategiesByPerformance([untried, replies, winner], performance).map(
        (strategy) => strategy.title
      )
    ).toEqual(["Winner", "Replies", "Untried"]);
  });

  it("does not mutate the list it was given", () => {
    const strategies = [
      buildStrategy({ title: "A" }),
      buildStrategy({ title: "B" }),
    ];
    const order = strategies.map((strategy) => strategy.title);

    sortStrategiesByPerformance(strategies, {});

    expect(strategies.map((strategy) => strategy.title)).toEqual(order);
  });
});
