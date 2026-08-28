"use client";

import * as React from "react";
import Link from "next/link";
import { ListChecksIcon, Trash2Icon } from "lucide-react";

import { SalesStrategy } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  StrategyPerformance,
  formatCadence,
  formatPercent,
  formatStrategyScore,
  getChannelLabel,
  getPerformance,
  getVerdictMeta,
  sortStrategies,
  sortStrategiesByPerformance,
} from "@/lib/sales";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  strategies: SalesStrategy[];
  /** Kept out of the main list, but reachable so one can be brought back. */
  deletedStrategies: SalesStrategy[];
  performance: Record<number, StrategyPerformance>;
};

export const SalesStrategiesList = ({
  strategies,
  deletedStrategies,
  performance,
}: Props) => {
  // Best first, so the page answers "what should I be using?" before it is read.
  const ordered = React.useMemo(
    () => sortStrategiesByPerformance(strategies, performance),
    [strategies, performance]
  );

  const deletedSection = deletedStrategies.length > 0 && (
    <details className="rounded-xl border border-dashed p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
        <Trash2Icon className="h-4 w-4" />
        Deleted ({deletedStrategies.length})
      </summary>
      <div className="space-y-2 pt-3">
        <p className="text-sm text-muted-foreground">
          Open one to bring it back. Leads that used it kept their history.
        </p>
        {sortStrategies(deletedStrategies).map((strategy) => (
          <Link
            key={strategy.id}
            href={`${Routes.SALES_STRATEGIES}/${strategy.id}`}
            prefetch
            className="touch-feedback flex h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm hover:bg-muted/40"
          >
            <span className="min-w-0 truncate">{strategy.title}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatStrategyScore(getPerformance(performance, strategy.id))}
            </span>
          </Link>
        ))}
      </div>
    </details>
  );

  if (ordered.length === 0) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ListChecksIcon className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No strategies yet</p>
              <p className="text-sm text-muted-foreground">
                Write down how a call should open, so the next person does not
                have to invent it.
              </p>
            </div>
            <Link
              href={Routes.ADD_SALES_STRATEGY}
              prefetch
              className="touch-feedback inline-flex h-11 items-center rounded-full bg-gray-900 px-5 text-sm font-medium text-gray-50 hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900"
            >
              Write one
            </Link>
          </CardContent>
        </Card>
        {deletedSection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        How each approach is doing. Best first.
      </p>

      {ordered.map((strategy) => {
        const score = getPerformance(performance, strategy.id);
        const verdict = getVerdictMeta(score.verdict);

        return (
          <Link
            key={strategy.id}
            href={`${Routes.SALES_STRATEGIES}/${strategy.id}`}
            prefetch
            className="touch-feedback block rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:focus:ring-gray-300"
          >
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold leading-tight">
                      {strategy.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getChannelLabel(strategy.channel)} ·{" "}
                      {formatCadence(strategy)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge className={verdict.badgeClass}>{verdict.label}</Badge>
                    {!strategy.is_active && (
                      <Badge variant="outline">Retired</Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm font-medium">
                  {formatStrategyScore(score)}
                </p>

                {score.leads > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Reply rate</span>
                      <span>{formatPercent(score.replyRate)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          score.replied > 0 ? "bg-violet-500" : "bg-muted"
                        )}
                        style={{
                          width: `${Math.round(score.replyRate * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}

      {deletedSection}
    </div>
  );
};
