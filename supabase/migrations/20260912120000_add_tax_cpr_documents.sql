-- CPR (Computerized Payment Receipt) documents, for filing personal tax returns.
--
-- Unlike every other document in this app, a CPR is not derived from data
-- here: it is FBR's own receipt for an actual tax payment, carrying a
-- government-issued CPR number that only FBR mints once the money has
-- actually reached the treasury. There is nothing to generate — the app can
-- only store the real file a manager uploads after DevNodes receives it from
-- FBR, one per employee per period, and gate who is allowed to open it.
--
-- A period is either a calendar month (matching how salary slips are picked)
-- or a tax quarter of the July-June tax year already used elsewhere in the
-- tax module, since withholding statements are commonly filed either way.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tax-cprs', 'tax-cprs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create table if not exists public.tax_cprs (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  period_type text not null check (period_type in ('month', 'quarter')),
  month integer check (month between 1 and 12),
  quarter integer check (quarter between 1 and 4),
  -- For a month, the calendar year; for a quarter, the tax year it falls in
  -- (named after the year it ends in, as `getTaxYearForMonth` does).
  year integer not null check (year >= 2000),
  -- Read off the receipt for search and display. The uploaded file stays the
  -- source of truth for both; these are not recomputed from anything.
  cpr_number text not null default '',
  amount numeric(12, 2) not null default 0,
  storage_path text not null,
  file_name text not null default '',
  uploaded_by_email text not null default '',
  created_at timestamptz not null default now(),
  check (
    (period_type = 'month' and month is not null and quarter is null) or
    (period_type = 'quarter' and quarter is not null and month is null)
  )
);

-- One CPR per employee per period, of either shape.
create unique index if not exists tax_cprs_seat_month_key
on public.tax_cprs (seat_id, year, month)
where period_type = 'month';

create unique index if not exists tax_cprs_seat_quarter_key
on public.tax_cprs (seat_id, year, quarter)
where period_type = 'quarter';

create index if not exists tax_cprs_seat_idx on public.tax_cprs (seat_id, year desc);

alter table public.tax_cprs enable row level security;

drop policy if exists "Managers manage CPR documents" on public.tax_cprs;
create policy "Managers manage CPR documents"
on public.tax_cprs
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- Read-only to the employee it belongs to: the file is FBR's record of a
-- payment DevNodes made, not something an employee's own edit should touch.
drop policy if exists "Employees read own CPR documents" on public.tax_cprs;
create policy "Employees read own CPR documents"
on public.tax_cprs
for select
to authenticated
using (public.is_employee_self(seat_id));

revoke all on public.tax_cprs from anon;
grant select, insert, update, delete on public.tax_cprs to authenticated;
grant usage, select on sequence public.tax_cprs_id_seq to authenticated;

-- Storage: each row above owns exactly one object, at
-- "<seat_id>/<year>/<period-segment>-<file name>", so ownership is read
-- straight from the path without a second lookup.
drop policy if exists "Managers manage CPR files" on storage.objects;
create policy "Managers manage CPR files"
on storage.objects
for all
to authenticated
using (bucket_id = 'tax-cprs' and public.is_manager())
with check (bucket_id = 'tax-cprs' and public.is_manager());

drop policy if exists "Employees read own CPR files" on storage.objects;
create policy "Employees read own CPR files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tax-cprs'
  and public.is_employee_self(
    nullif((storage.foldername(name))[1], '')::bigint
  )
);
