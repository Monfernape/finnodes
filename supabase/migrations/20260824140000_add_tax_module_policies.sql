-- The tax tables came up with row level security on and no policies attached,
-- so the SQL editor (which connects as postgres and bypasses RLS) showed every
-- row while the app, which connects as `authenticated`, read them as empty.
--
-- Access is granted to `authenticated` rather than to managers alone on
-- purpose: the manager allowlist falls back to the ALLOWED_EMAILS env var,
-- which the database cannot see, so a manager check written as a policy would
-- lock out anyone allowlisted that way. Manager-only visibility stays where it
-- already is, on the /tax routes.
--
-- Enabling RLS here is a no-op when it is already on, and when it is off it
-- closes the tables to anon while leaving the app untouched, so this migration
-- is safe whichever state the tables are in.

alter table public.tax_years enable row level security;
alter table public.tax_slabs enable row level security;

grant select, insert, update, delete on public.tax_years to authenticated;
grant select, insert, update, delete on public.tax_slabs to authenticated;

-- Inserts through the create form need the bigserial sequences too.
grant usage, select on sequence public.tax_years_id_seq to authenticated;
grant usage, select on sequence public.tax_slabs_id_seq to authenticated;

drop policy if exists "Authenticated manage tax years" on public.tax_years;
create policy "Authenticated manage tax years"
on public.tax_years
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage tax slabs" on public.tax_slabs;
create policy "Authenticated manage tax slabs"
on public.tax_slabs
for all
to authenticated
using (true)
with check (true);
