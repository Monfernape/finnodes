import { SalesLead, SalesLeadStatus, SalesLeadUpdate, SalesStrategy } from "@/entities";
import { RESPONDED_PROGRESS, STATUS_PROGRESS, getStatusProgress } from "./constants";

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

/** A deleted strategy is kept only so old leads still read correctly. */
export const isLiveStrategy = (
  strategy: Pick<SalesStrategy, "deleted_at">
) => strategy.deleted_at === null;

export const getLiveStrategies = (strategies: SalesStrategy[]) =>
  strategies.filter(isLiveStrategy);

/** What the picker offers for a new lead: live, and not retired. */
export const getSelectableStrategies = (strategies: SalesStrategy[]) =>
  strategies.filter((strategy) => isLiveStrategy(strategy) && strategy.is_active);

export const sortStrategies = (strategies: SalesStrategy[]) =>
  [...strategies].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) || a.title.localeCompare(b.title)
  );

export const getStrategyById = (
  strategies: SalesStrategy[],
  strategyId: number | null
) => strategies.find((strategy) => strategy.id === strategyId) || null;

/** "Follow up every 3 days" — how a strategy's gap reads on a card. */
export const formatCadence = (
  strategy: Pick<SalesStrategy, "follow_up_after_days">
) => {
  if (strategy.follow_up_after_days <= 0) {
    return "No set gap";
  }
  if (strategy.follow_up_after_days === 1) {
    return "Follow up next day";
  }
  return `Follow up every ${strategy.follow_up_after_days} days`;
};

// ---------------------------------------------------------------------------
// Did it work?
// ---------------------------------------------------------------------------

/**
 * The furthest each lead ever got, which is what the counts are built from.
 *
 * A lead's current status is not enough on its own. Somebody who talked to us
 * for a month and then said no sits at Lost, exactly where somebody who never
 * picked up the phone sits — and a strategy that starts conversations it
 * cannot close is a different problem from one nobody answers. The updates
 * carry every move that was ever made, so the high-water mark comes from
 * those, with the current status included in case a status was changed on the
 * edit form without an update being logged.
 */
export const getReachedProgressByLeadId = (
  leads: Pick<SalesLead, "id" | "status">[],
  updates: Pick<SalesLeadUpdate, "lead_id" | "status_after">[]
) => {
  const reached: Record<number, number> = {};

  leads.forEach((lead) => {
    reached[lead.id] = getStatusProgress(lead.status);
  });

  updates.forEach((update) => {
    if (update.status_after === null || !(update.lead_id in reached)) {
      return;
    }
    reached[update.lead_id] = Math.max(
      reached[update.lead_id],
      getStatusProgress(update.status_after)
    );
  });

  return reached;
};

export enum StrategyVerdict {
  /** Not enough leads have been through it to say anything honest. */
  TooEarly = "too_early",
  Working = "working",
  Mixed = "mixed",
  NotLanding = "not_landing",
}

/**
 * Below this, a strategy has no verdict. Four leads and one reply is not a
 * 25% reply rate, it is one reply, and showing it as a rate invites the team
 * to drop something that was never really tried.
 */
export const MIN_LEADS_FOR_VERDICT = 5;

/** Cold outreach reply rates: a quarter is good, under a tenth is not working. */
export const WORKING_REPLY_RATE = 0.25;
export const MIXED_REPLY_RATE = 0.1;

export type StrategyPerformance = {
  strategyId: number;
  /** Leads that have ever been pointed at this strategy. */
  leads: number;
  /** Leads where somebody on the other side actually engaged. */
  replied: number;
  meetings: number;
  quoted: number;
  won: number;
  lost: number;
  open: number;
  /** 0–1. Zero leads gives zero rather than a division by nothing. */
  replyRate: number;
  winRate: number;
  /** The last day anything was logged against it, or null if never. */
  lastWorkedOn: string | null;
  verdict: StrategyVerdict;
};

export const EMPTY_STRATEGY_PERFORMANCE: Omit<StrategyPerformance, "strategyId"> =
  {
    leads: 0,
    replied: 0,
    meetings: 0,
    quoted: 0,
    won: 0,
    lost: 0,
    open: 0,
    replyRate: 0,
    winRate: 0,
    lastWorkedOn: null,
    verdict: StrategyVerdict.TooEarly,
  };

const getVerdict = (leads: number, replied: number, won: number) => {
  if (leads < MIN_LEADS_FOR_VERDICT) {
    return StrategyVerdict.TooEarly;
  }

  const replyRate = replied / leads;
  // A signed client settles it regardless of how quiet the replies were.
  if (won > 0 || replyRate >= WORKING_REPLY_RATE) {
    return StrategyVerdict.Working;
  }
  if (replyRate >= MIXED_REPLY_RATE) {
    return StrategyVerdict.Mixed;
  }
  return StrategyVerdict.NotLanding;
};

/**
 * Scores every strategy in one pass over the leads and updates, so a page
 * showing the whole list does not walk the data once per strategy.
 */
export const buildStrategyPerformance = (
  strategies: Pick<SalesStrategy, "id">[],
  leads: Pick<SalesLead, "id" | "status" | "strategy_id">[],
  updates: Pick<SalesLeadUpdate, "lead_id" | "status_after" | "happened_on">[]
): Record<number, StrategyPerformance> => {
  const reached = getReachedProgressByLeadId(leads, updates);
  const strategyIdByLeadId: Record<number, number> = {};
  const performance: Record<number, StrategyPerformance> = {};

  strategies.forEach((strategy) => {
    performance[strategy.id] = {
      ...EMPTY_STRATEGY_PERFORMANCE,
      strategyId: strategy.id,
    };
  });

  leads.forEach((lead) => {
    if (lead.strategy_id === null || !(lead.strategy_id in performance)) {
      return;
    }

    strategyIdByLeadId[lead.id] = lead.strategy_id;
    const score = performance[lead.strategy_id];
    const progress = reached[lead.id] ?? 0;

    score.leads += 1;
    if (progress >= RESPONDED_PROGRESS) {
      score.replied += 1;
    }
    if (progress >= STATUS_PROGRESS[SalesLeadStatus.Meeting]) {
      score.meetings += 1;
    }
    if (progress >= STATUS_PROGRESS[SalesLeadStatus.Proposal]) {
      score.quoted += 1;
    }
    if (lead.status === SalesLeadStatus.Won) {
      score.won += 1;
    } else if (lead.status === SalesLeadStatus.Lost) {
      score.lost += 1;
    } else {
      score.open += 1;
    }
  });

  updates.forEach((update) => {
    const strategyId = strategyIdByLeadId[update.lead_id];
    if (strategyId === undefined) {
      return;
    }
    const score = performance[strategyId];
    if (
      score.lastWorkedOn === null ||
      update.happened_on > score.lastWorkedOn
    ) {
      score.lastWorkedOn = update.happened_on;
    }
  });

  Object.values(performance).forEach((score) => {
    score.replyRate = score.leads > 0 ? score.replied / score.leads : 0;
    score.winRate = score.leads > 0 ? score.won / score.leads : 0;
    score.verdict = getVerdict(score.leads, score.replied, score.won);
  });

  return performance;
};

export const getPerformance = (
  performance: Record<number, StrategyPerformance>,
  strategyId: number
): StrategyPerformance =>
  performance[strategyId] || {
    ...EMPTY_STRATEGY_PERFORMANCE,
    strategyId,
  };

// ---------------------------------------------------------------------------
// Saying it in words
// ---------------------------------------------------------------------------

export type StrategyVerdictMeta = {
  verdict: StrategyVerdict;
  label: string;
  description: string;
  badgeClass: string;
};

export const STRATEGY_VERDICTS: StrategyVerdictMeta[] = [
  {
    verdict: StrategyVerdict.Working,
    label: "Working",
    description: "People reply to this one. Keep using it.",
    badgeClass:
      "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    verdict: StrategyVerdict.Mixed,
    label: "Some replies",
    description: "A few people answer. Worth changing the wording and retrying.",
    badgeClass:
      "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  {
    verdict: StrategyVerdict.NotLanding,
    label: "Not landing",
    description: "Almost nobody replies. Try a different approach.",
    badgeClass:
      "border-transparent bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  {
    verdict: StrategyVerdict.TooEarly,
    label: "Too early to tell",
    description: `Needs ${MIN_LEADS_FOR_VERDICT} leads before the numbers mean anything.`,
    badgeClass:
      "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
];

export const getVerdictMeta = (verdict: StrategyVerdict) =>
  STRATEGY_VERDICTS.find((meta) => meta.verdict === verdict) ||
  STRATEGY_VERDICTS[STRATEGY_VERDICTS.length - 1];

export const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;

/** "12 tried · 5 replied · 2 won" — the whole story on one line. */
export const formatStrategyScore = (score: StrategyPerformance) => {
  if (score.leads === 0) {
    return "No leads yet";
  }

  return [
    `${score.leads} ${score.leads === 1 ? "lead" : "leads"}`,
    `${score.replied} replied`,
    `${score.won} won`,
  ].join(" · ");
};

/** Best first, so the list answers "what should I be using?" at a glance. */
export const sortStrategiesByPerformance = (
  strategies: SalesStrategy[],
  performance: Record<number, StrategyPerformance>
) =>
  [...strategies].sort((a, b) => {
    const scoreA = getPerformance(performance, a.id);
    const scoreB = getPerformance(performance, b.id);

    // Anything with a verdict outranks anything still being tried out.
    const settledA = scoreA.verdict !== StrategyVerdict.TooEarly;
    const settledB = scoreB.verdict !== StrategyVerdict.TooEarly;
    if (settledA !== settledB) {
      return settledA ? -1 : 1;
    }

    return (
      scoreB.won - scoreA.won ||
      scoreB.replyRate - scoreA.replyRate ||
      scoreB.leads - scoreA.leads ||
      a.title.localeCompare(b.title)
    );
  });
