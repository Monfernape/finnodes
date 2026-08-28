"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, RotateCcwIcon } from "lucide-react";

import { SalesStrategy } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  StrategyPerformance,
  StrategyVerdict,
  formatCadence,
  formatPercent,
  formatSalesDay,
  getChannelLabel,
  getOwnerLabel,
  getVerdictMeta,
} from "@/lib/sales";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  strategy: SalesStrategy;
  score: StrategyPerformance;
};

export const SalesStrategyDetail = ({ strategy, score }: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = React.useState(false);
  const verdict = getVerdictMeta(score.verdict);
  const isDeleted = strategy.deleted_at !== null;

  const restore = async () => {
    setIsRestoring(true);
    const { error } = await supabaseClient
      .from(DatabaseTable.SalesStrategies)
      .update({ deleted_at: null })
      .eq("id", strategy.id);
    setIsRestoring(false);

    if (error) {
      toast({
        title: "Could not bring it back",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Strategy restored" });
    markRouteStale(Routes.SALES_STRATEGIES);
    markRouteStale(Routes.SALES);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {isDeleted && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">This strategy was deleted</p>
              <p className="text-sm text-muted-foreground">
                Leads that used it keep their history. Nobody can pick it for a
                new lead until it comes back.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-2"
              onClick={restore}
              disabled={isRestoring}
            >
              <RotateCcwIcon className="h-4 w-4" />
              {isRestoring ? "Bringing back…" : "Bring it back"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {getChannelLabel(strategy.channel)}
              </Badge>
              {!strategy.is_active && <Badge variant="outline">Retired</Badge>}
            </div>
            <h2 className="text-xl font-semibold leading-tight">
              {strategy.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatCadence(strategy)}
              {strategy.created_by_email &&
                ` · written by ${getOwnerLabel(strategy.created_by_email)}`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`${Routes.SALES_STRATEGIES}/${strategy.id}/edit`}
              prefetch
              className="touch-feedback inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Is it working?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={cn("text-sm", verdict.badgeClass)}>
              {verdict.label}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {verdict.description}
            </p>
          </div>

          {score.leads === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No leads have used this yet. Pick it on a lead and the numbers
              start filling in.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <FunnelRow
                  label="Leads tried"
                  value={score.leads}
                  total={score.leads}
                  tone="bg-gray-400 dark:bg-gray-600"
                />
                <FunnelRow
                  label="Replied to us"
                  value={score.replied}
                  total={score.leads}
                  tone="bg-violet-500"
                />
                <FunnelRow
                  label="Meetings"
                  value={score.meetings}
                  total={score.leads}
                  tone="bg-blue-500"
                />
                <FunnelRow
                  label="Quotes sent"
                  value={score.quoted}
                  total={score.leads}
                  tone="bg-amber-500"
                />
                <FunnelRow
                  label="Signed"
                  value={score.won}
                  total={score.leads}
                  tone="bg-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Reply rate"
                  value={formatPercent(score.replyRate)}
                />
                <Stat label="Win rate" value={formatPercent(score.winRate)} />
                <Stat label="Still open" value={score.open.toString()} />
                <Stat label="Lost" value={score.lost.toString()} />
              </div>

              <p className="text-sm text-muted-foreground">
                {score.lastWorkedOn
                  ? `Last used on ${formatSalesDay(score.lastWorkedOn)}.`
                  : "Nothing has been logged against it yet."}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {strategy.approach && (
        <Card>
          <CardHeader>
            <CardTitle>How the call opens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {strategy.approach}
            </p>
          </CardContent>
        </Card>
      )}

      {strategy.follow_up_plan && (
        <Card>
          <CardHeader>
            <CardTitle>Following up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {strategy.follow_up_plan}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

type FunnelRowProps = {
  label: string;
  value: number;
  total: number;
  tone: string;
};

/**
 * A bar rather than a bare number: five rows shrinking down the page says
 * "people drop off here" faster than a table of counts ever does.
 */
const FunnelRow = ({ label, value, total, tone }: FunnelRowProps) => {
  const width = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {value}
          {total > 0 && value !== total && (
            <span className="pl-1 font-normal text-muted-foreground">
              ({width}%)
            </span>
          )}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${value} of ${total}`}
      >
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="pt-0.5 text-lg font-semibold">{value}</p>
  </div>
);
