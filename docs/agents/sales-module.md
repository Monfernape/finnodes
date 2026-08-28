# Sales Module

Use this guide when changing anything under `app/(main)/sales/` or `lib/sales/`.

The module is a hand-maintained record of cold outreach: leads, the strategies
used to work them, and a log of what was said. Nothing syncs, imports, or
scores itself — every row is something a person decided.

## Where things go

```
lib/sales/
  constants.ts   statuses, channels, progress ranking, badge classes
  dates.ts       the office day, follow-up state, date formatting and maths
  leads.ts       sorting, search, the list summary, last-touch indexing
  outcomes.ts    the one-tap call outcomes and the dates they imply
  owners.ts      who a lead can be assigned to
  strategies.ts  soft-delete filters and the scoreboard
  queries.ts     every database read (server only)
  index.ts       the barrel — pure logic only
```

Two rules keep this workable as features are added:

1. **`queries.ts` owns every read of the sales tables.** A soft delete is only
   as good as the least careful query, so no page selects from `sales_*`
   directly. It is also where paging lives: reads that can grow without bound
   go through `fetchAllRows`, which pages by id and throws rather than silently
   returning a truncated set.
2. **`index.ts` exports pure logic only.** `queries.ts` is deliberately left
   out of the barrel so a server-only import is never pulled into a browser
   bundle by a client component importing `@/lib/sales`.

New logic goes in the file that matches its subject, or a new one beside them.
Anything with a rule in it belongs in `lib/sales/`, not in a component — that
is what makes it testable.

## Tests

`yarn test` runs `lib/**/*.test.ts` under Vitest. Every module above has a
matching `.test.ts`, and `test-fixtures.ts` builds entities with sensible
defaults so a test reads as the one thing it checks. Component behaviour worth
protecting is extracted into `lib/sales/` and tested there rather than mocked
through the DOM.

## Who can see it

Managers, plus any active employee holding a job title flagged
`grants_sales_access`. An employee can hold several titles — the engineer who
also does business development — and one sales title is enough.

The rule lives in `public.can_access_sales()` and has exactly one definition.
Three things read it, and they must never drift apart:

1. the row policies on `sales_leads`, `sales_strategies` and `sales_lead_updates`
2. `resolvePeopleAccess`, which calls it over RPC to decide whether Sales
   appears in the menu
3. the `sales_owner_options` view

Do not re-express the rule in TypeScript. If who-can-see-Sales changes, change
the function.

`sales_owner_options` deserves its own note. A salesperson needs colleagues'
names to hand a lead over, but must never be able to read `seats`, where the
salaries are. The view exposes three columns and is deliberately **not**
`security_invoker`: it runs as its owner, so the base-table policies do not
filter it, and a `where public.can_access_sales()` clause takes their place. If
you add columns to it, keep that in mind — anything selected there is readable
by every salesperson.

Middleware matters too. `isEmployeeAllowedPath` in `utils/auth/employee-paths.ts`
is what stops an employee reaching manager routes, and it runs before any page's
own check. `/sales` opens there conditionally, next to `/salaries`, which merely
starts the same way — hence the path-boundary match and the tests around it.

`seats.designation` is untouched by any of this. It stays the single title
printed on payslips, disbursement letters and experience letters, because those
go outside the company and must keep reading the way they always have.

## Three states for a strategy

- **active** — offered in the picker for new leads
- **retired** (`is_active = false`) — still named on its leads and still
  counted, but not offered for new ones
- **deleted** (`deleted_at` set) — hidden from the app, kept so old leads read
  correctly and their results survive; restorable from the strategy's own page

Retiring is the ordinary end of a strategy. Deleting is for the one added by
mistake.

## Judging a strategy

A lead counts as having *replied* when it ever reached "Talking" or beyond. The
high-water mark comes from the update history rather than the current status,
because a lead that talked for a month and then said no sits at Lost — exactly
where one that never answered sits. A strategy that starts conversations it
cannot close is a different problem from one nobody answers, and the numbers
have to be able to tell them apart.

No verdict is shown below `MIN_LEADS_FOR_VERDICT` leads: four leads and one
reply is one reply, not a 25% reply rate.
