-- A salary sheet can carry its own title.
--
-- Until now the heading was worked out from the month and the dispatch type,
-- which reads as "May 2026 | First dispatch". The letters actually sent to the
-- bank are named things like "May P1 2026 Salaries", and a sheet sometimes
-- needs to say something the month alone does not — a re-issue, a correction,
-- a partial run for one team.
--
-- Left empty by default rather than backfilled with the derived heading: an
-- empty title means "use the month", so sheets nobody renames keep following
-- the month and year automatically, including after a duplicate into a new
-- period. Only a title somebody deliberately typed overrides it.
alter table public.salary_sheets
add column if not exists title text not null default '';
