"use client";

import * as React from "react";
import Link from "next/link";
import { ListChecksIcon, PhoneCallIcon, SearchIcon } from "lucide-react";

import { SalesLead, SalesLeadStatus, SalesStrategy } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  FollowUpState,
  LastTouch,
  SALES_LEAD_STATUSES,
  SalesOwnerOption,
  formatFollowUp,
  formatSalesDay,
  getFollowUp,
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
  getOwnerName,
  getSalesToday,
  getStrategyById,
  matchesLeadSearch,
  sortLeadsByUrgency,
  summariseLeads,
} from "@/lib/sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  leads: SalesLead[];
  strategies: SalesStrategy[];
  lastTouchByLeadId: Record<number, LastTouch>;
  owners: SalesOwnerOption[];
};

// Anything overdue or due today is the day's work, so it gets the only colour
// on the card that carries meaning.
const FOLLOW_UP_TONE: Record<FollowUpState, string> = {
  [FollowUpState.Overdue]: "text-red-600 dark:text-red-400",
  [FollowUpState.Today]: "text-amber-600 dark:text-amber-400",
  [FollowUpState.Upcoming]: "text-muted-foreground",
  [FollowUpState.None]: "text-muted-foreground",
};

export const SalesLeadsList = ({
  leads,
  strategies,
  lastTouchByLeadId,
  owners,
}: Props) => {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<SalesLeadStatus | null>(null);
  const [dueOnly, setDueOnly] = React.useState(false);

  // Pinned once per render so every card on the page measures against the same
  // day, however long the tab has been left open.
  const today = React.useMemo(() => getSalesToday(), []);
  const summary = React.useMemo(
    () => summariseLeads(leads, today),
    [leads, today]
  );

  const visible = React.useMemo(() => {
    const filtered = leads.filter((lead) => {
      if (status && lead.status !== status) {
        return false;
      }
      if (dueOnly) {
        const { state } = getFollowUp(lead, today);
        if (state !== FollowUpState.Overdue && state !== FollowUpState.Today) {
          return false;
        }
      }
      return matchesLeadSearch(lead, search);
    });

    return sortLeadsByUrgency(filtered, today);
  }, [leads, status, dueOnly, search, today]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Due now"
          value={summary.due}
          tone={summary.due > 0 ? "urgent" : "plain"}
        />
        <SummaryTile
          label="Overdue"
          value={summary.overdue}
          tone={summary.overdue > 0 ? "urgent" : "plain"}
        />
        <SummaryTile label="Open" value={summary.open} tone="plain" />
        <SummaryTile
          label="No date set"
          value={summary.unscheduled}
          tone={summary.unscheduled > 0 ? "warn" : "plain"}
        />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, contact or notes"
            className="h-11 pl-9"
            aria-label="Search leads"
          />
        </div>

        {/* Scrolls inside itself on a phone: a filter row wider than its parent
            would grow the page canvas sideways instead. */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter leads"
        >
          <Button
            type="button"
            variant={dueOnly ? "default" : "outline"}
            className="h-11 shrink-0 rounded-full px-5"
            aria-pressed={dueOnly}
            onClick={() => setDueOnly((current) => !current)}
          >
            Due now
          </Button>
          <Button
            type="button"
            variant={!status ? "default" : "outline"}
            className="h-11 shrink-0 rounded-full px-5"
            aria-pressed={!status}
            onClick={() => setStatus(null)}
          >
            All
          </Button>
          {SALES_LEAD_STATUSES.map((meta) => (
            <Button
              key={meta.status}
              type="button"
              variant={status === meta.status ? "default" : "outline"}
              className="h-11 shrink-0 rounded-full px-5"
              aria-pressed={status === meta.status}
              onClick={() => setStatus(meta.status)}
            >
              {meta.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {visible.length} of {leads.length} leads
          </p>
          <Link
            href={Routes.SALES_STRATEGIES}
            prefetch
            className="touch-feedback inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <ListChecksIcon className="h-4 w-4" />
            Strategies
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PhoneCallIcon className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {leads.length === 0 ? "No leads yet" : "Nothing matches"}
              </p>
              <p className="text-sm text-muted-foreground">
                {leads.length === 0
                  ? "Add the first company worth calling."
                  : "Try a different search or clear the filters."}
              </p>
            </div>
            {leads.length === 0 && (
              <Link
                href={Routes.ADD_SALES_LEAD}
                prefetch
                className="touch-feedback inline-flex h-11 items-center rounded-full bg-gray-900 px-5 text-sm font-medium text-gray-50 hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900"
              >
                Add a lead
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((lead) => {
            const followUp = getFollowUp(lead, today);
            const strategy = getStrategyById(strategies, lead.strategy_id);
            const lastTouch = lastTouchByLeadId[lead.id];

            return (
              <Link
                key={lead.id}
                href={`${Routes.SALES}/${lead.id}`}
                prefetch
                className="touch-feedback block rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:focus:ring-gray-300"
              >
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-semibold leading-tight">
                          {lead.company}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[lead.contact_name, lead.contact_role]
                            .filter(Boolean)
                            .join(" · ") || "No contact named"}
                        </p>
                      </div>
                      <Badge
                        className={cn("shrink-0", getLeadStatusBadgeClass(lead.status))}
                      >
                        {getLeadStatusLabel(lead.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span
                        className={cn("font-medium", FOLLOW_UP_TONE[followUp.state])}
                      >
                        {formatFollowUp(followUp)}
                      </span>
                      {lead.next_follow_up_on &&
                        followUp.state !== FollowUpState.None && (
                          <span className="text-muted-foreground">
                            {formatSalesDay(lead.next_follow_up_on)}
                          </span>
                        )}
                      <span className="text-muted-foreground">
                        {getOwnerName(owners, lead.owner_email)}
                      </span>
                      {strategy && (
                        <span className="truncate text-muted-foreground">
                          {strategy.title}
                        </span>
                      )}
                    </div>

                    {lastTouch && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatSalesDay(lastTouch.happenedOn)}:
                        </span>{" "}
                        {lastTouch.note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

type SummaryTileProps = {
  label: string;
  value: number;
  tone: "urgent" | "warn" | "plain";
};

const SUMMARY_TONE: Record<SummaryTileProps["tone"], string> = {
  urgent: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  plain: "text-foreground",
};

const SummaryTile = ({ label, value, tone }: SummaryTileProps) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("pt-1 text-2xl font-semibold", SUMMARY_TONE[tone])}>
        {value}
      </p>
    </CardContent>
  </Card>
);
