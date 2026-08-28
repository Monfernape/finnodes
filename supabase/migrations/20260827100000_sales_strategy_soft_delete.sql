-- Deleting a strategy stops destroying it.
--
-- A strategy is the only record of why a lead was approached the way it was,
-- and it is now also what the numbers on it are attributed to. Removing the
-- row took both away: the leads survived with a null link, but their history
-- lost its name and every count that strategy had earned went with it.
--
-- Three states now, and they are not the same thing:
--
--   active            in the picker, offered for new leads
--   retired           still named on its leads and still counted, but nobody
--                     starts a new lead on it (`is_active = false`)
--   deleted           gone from the app, kept in the table so that existing
--                     leads keep reading correctly and can be restored
--
-- Retiring is the ordinary end of a strategy that stopped earning its place.
-- Deleting is for the one added by mistake.
alter table public.sales_strategies
add column if not exists deleted_at timestamptz;

-- Every list, picker and count reads live strategies only, so the filter is
-- worth an index of its own.
create index if not exists sales_strategies_live_idx
on public.sales_strategies (is_active, title)
where deleted_at is null;

drop index if exists public.sales_strategies_active_idx;
