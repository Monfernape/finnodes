import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SalesLead,
  SalesLeadUpdate,
  SalesOwnerRow,
  SalesStrategy,
} from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalesOwnerOption, getOwnerOptions } from "./owners";

/**
 * Every read the sales pages make, in one place.
 *
 * The reason this exists rather than each page calling Supabase directly is
 * `deleted_at`: a soft delete is only as good as the least careful query, and
 * one page forgetting the filter would put a deleted strategy back in front of
 * somebody. Nothing outside this file selects from the sales tables.
 */

type Client = SupabaseClient;

type QueryResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

/** Supabase caps a single response, so anything unbounded is read in pages. */
const PAGE_SIZE = 1000;

/**
 * Reads every row a query matches, a page at a time.
 *
 * Without this, a workspace past the API's row cap would quietly return a
 * truncated set: leads would lose their last-touch line and a strategy's score
 * would be computed from an arbitrary slice, which is worse than an error
 * because it looks like an answer. Each page is ordered by id so the windows
 * cannot overlap or skip.
 */
const fetchAllRows = async <Row>(
  label: string,
  runPage: (from: number, to: number) => PromiseLike<QueryResult<Row>>
): Promise<Row[]> => {
  const rows: Row[] = [];

  for (let page = 0; ; page += 1) {
    const { data, error } = await runPage(
      page * PAGE_SIZE,
      (page + 1) * PAGE_SIZE - 1
    );

    if (error) {
      throw new Error(`Could not load ${label}: ${error.message}`);
    }

    const batch = data || [];
    batch.forEach((row) => rows.push(row));

    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }
};

const unwrap = <Row>(label: string, result: QueryResult<Row>) => {
  if (result.error) {
    throw new Error(`Could not load ${label}: ${result.error.message}`);
  }
  return result.data || [];
};

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

export const fetchStrategies = async (
  supabase: Client,
  { includeDeleted = false }: { includeDeleted?: boolean } = {}
) => {
  const query = supabase.from(DatabaseTable.SalesStrategies).select();
  const result = await (includeDeleted
    ? query
    : query.is("deleted_at", null)
  ).returns<SalesStrategy[]>();

  return unwrap("strategies", result);
};

/** Only the ones that have been deleted, for the restore list. */
export const fetchDeletedStrategies = async (supabase: Client) => {
  const result = await supabase
    .from(DatabaseTable.SalesStrategies)
    .select()
    .not("deleted_at", "is", null)
    .returns<SalesStrategy[]>();

  return unwrap("deleted strategies", result);
};

/** Deleted ones included, because an old lead still names the one it used. */
export const fetchStrategy = async (supabase: Client, strategyId: string) => {
  const { data, error } = await supabase
    .from(DatabaseTable.SalesStrategies)
    .select()
    .eq("id", strategyId)
    .maybeSingle<SalesStrategy>();

  if (error) {
    throw new Error(`Could not load the strategy: ${error.message}`);
  }

  return data;
};

/**
 * What the strategy picker should offer when editing one particular lead: the
 * live strategies, plus the lead's own if it has since been deleted. Without
 * that second half the picker would sit blank on a lead whose strategy is gone
 * and quietly reassign it on the next save.
 */
export const fetchStrategiesForLead = async (
  supabase: Client,
  strategyId: number | null
) => {
  const live = await fetchStrategies(supabase);
  if (
    strategyId === null ||
    live.some((strategy) => strategy.id === strategyId)
  ) {
    return live;
  }

  const missing = await fetchStrategy(supabase, strategyId.toString());
  return missing ? [...live, missing] : live;
};

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const fetchLeads = async (supabase: Client) =>
  fetchAllRows<SalesLead>("leads", (from, to) =>
    supabase
      .from(DatabaseTable.SalesLeads)
      .select()
      .order("id", { ascending: true })
      .range(from, to)
      .returns<SalesLead[]>()
  );

export const fetchLead = async (supabase: Client, leadId: string) => {
  const { data, error } = await supabase
    .from(DatabaseTable.SalesLeads)
    .select()
    .eq("id", leadId)
    .maybeSingle<SalesLead>();

  if (error) {
    throw new Error(`Could not load the lead: ${error.message}`);
  }

  return data;
};

export const fetchLeadUpdates = async (supabase: Client, leadId: number) =>
  fetchAllRows<SalesLeadUpdate>("this lead's history", (from, to) =>
    supabase
      .from(DatabaseTable.SalesLeadUpdates)
      .select()
      .eq("lead_id", leadId)
      .order("id", { ascending: true })
      .range(from, to)
      .returns<SalesLeadUpdate[]>()
  );

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** The columns the scoreboard needs, and nothing else. */
export type LeadScoreInput = Pick<SalesLead, "id" | "status" | "strategy_id">;
export type UpdateScoreInput = Pick<
  SalesLeadUpdate,
  "lead_id" | "status_after" | "happened_on"
>;

/**
 * Scoped by strategy where the caller only needs one, so a strategy's own page
 * reads its own leads rather than every lead in the workspace.
 */
export const fetchLeadsForScoring = async (
  supabase: Client,
  { strategyId }: { strategyId?: number } = {}
) =>
  fetchAllRows<LeadScoreInput>("leads", (from, to) => {
    const query = supabase
      .from(DatabaseTable.SalesLeads)
      .select("id, status, strategy_id")
      .order("id", { ascending: true })
      .range(from, to);

    return (
      strategyId === undefined ? query : query.eq("strategy_id", strategyId)
    ).returns<LeadScoreInput[]>();
  });

export const fetchUpdatesForScoring = async (
  supabase: Client,
  { leadIds }: { leadIds?: number[] } = {}
) => {
  // An empty set of leads has no updates worth a round trip.
  if (leadIds !== undefined && leadIds.length === 0) {
    return [];
  }

  return fetchAllRows<UpdateScoreInput>("lead history", (from, to) => {
    const query = supabase
      .from(DatabaseTable.SalesLeadUpdates)
      .select("lead_id, status_after, happened_on")
      .order("id", { ascending: true })
      .range(from, to);

    return (
      leadIds === undefined ? query : query.in("lead_id", leadIds)
    ).returns<UpdateScoreInput[]>();
  });
};

/** The newest update per lead, for the list cards. */
export type LastTouchInput = Pick<
  SalesLeadUpdate,
  "id" | "lead_id" | "happened_on" | "note" | "author_email"
>;

export const fetchLastTouches = async (supabase: Client) =>
  fetchAllRows<LastTouchInput>("recent activity", (from, to) =>
    supabase
      .from(DatabaseTable.SalesLeadUpdates)
      .select("id, lead_id, happened_on, note, author_email")
      .order("id", { ascending: true })
      .range(from, to)
      .returns<LastTouchInput[]>()
  );

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/**
 * Reads the `sales_owner_options` view rather than `seats` and `managers`.
 *
 * A salesperson needs colleagues' names to hand a lead over, but must never be
 * given read access to `seats`, where the salaries are. The view exposes three
 * columns and gates itself on the same check as the sales tables.
 */
export const fetchOwners = async (
  supabase: Client
): Promise<SalesOwnerOption[]> => {
  const result = await supabase
    .from(DatabaseTable.SalesOwnerOptions)
    .select()
    .returns<SalesOwnerRow[]>();

  return getOwnerOptions(unwrap("the people list", result));
};
