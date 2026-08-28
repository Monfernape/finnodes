-- Employees can hold more than one title, and one of them opens the sales module.
--
-- `seats.designation` stays exactly what it was: the single title printed on
-- payslips, disbursement letters and experience letters. Nothing here touches
-- it, because those documents go outside the company and must keep reading the
-- way they always have. What is added alongside it is the fuller truth — the
-- engineer who also does business development — and one of those titles is
-- what decides who sees Sales.

-- The catalogue ------------------------------------------------------------

create table if not exists public.job_titles (
  id bigserial primary key,
  name text not null unique,
  -- Whoever holds a title flagged here can open the sales module. This is the
  -- only thing in the app that grants access on anything other than being a
  -- manager, so it is a column a manager sets deliberately rather than
  -- anything inferred from the wording of a title.
  grants_sales_access boolean not null default false,
  -- Marks the rows this migration put there, so the UI can say which titles
  -- came with the app and which somebody typed.
  is_seeded boolean not null default false,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_titles_sales_idx
on public.job_titles (grants_sales_access)
where grants_sales_access;

-- Who holds what -----------------------------------------------------------

create table if not exists public.seat_titles (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  job_title_id bigint not null references public.job_titles(id) on delete cascade,
  -- Access follows from this row, so who granted it is worth keeping.
  assigned_by_email text not null default '',
  created_at timestamptz not null default now(),
  unique (seat_id, job_title_id)
);

create index if not exists seat_titles_seat_idx on public.seat_titles (seat_id);
create index if not exists seat_titles_title_idx on public.seat_titles (job_title_id);

drop trigger if exists job_titles_touch on public.job_titles;
create trigger job_titles_touch
before update on public.job_titles
for each row
execute function public.touch_sales_record();

-- Who can see Sales --------------------------------------------------------

-- Managers, plus any active employee holding a title flagged as a sales role.
-- Seat matching follows `is_employee_self`: by auth user once the seat has been
-- claimed, by login email before that.
create or replace function public.can_access_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_manager() or exists (
    select 1
    from public.seat_titles
    join public.job_titles
      on job_titles.id = seat_titles.job_title_id
    join public.seats
      on seats.id = seat_titles.seat_id
    where job_titles.grants_sales_access
      and seats.people_status = 'active'
      and (
        seats.auth_user_id = auth.uid()
        or (
          seats.auth_user_id is null
          and lower(seats.login_email) = public.current_auth_email()
        )
      )
  );
$$;

-- The sales tables open to salespeople, not just managers.
drop policy if exists "Managers manage sales strategies" on public.sales_strategies;
drop policy if exists "Sales access manages strategies" on public.sales_strategies;
create policy "Sales access manages strategies"
on public.sales_strategies
for all
to authenticated
using (public.can_access_sales())
with check (public.can_access_sales());

drop policy if exists "Managers manage sales leads" on public.sales_leads;
drop policy if exists "Sales access manages leads" on public.sales_leads;
create policy "Sales access manages leads"
on public.sales_leads
for all
to authenticated
using (public.can_access_sales())
with check (public.can_access_sales());

drop policy if exists "Managers manage sales lead updates" on public.sales_lead_updates;
drop policy if exists "Sales access manages lead updates" on public.sales_lead_updates;
create policy "Sales access manages lead updates"
on public.sales_lead_updates
for all
to authenticated
using (public.can_access_sales())
with check (public.can_access_sales());

-- The app calls this directly to decide whether to show Sales in the nav, so
-- the menu and the row policies can never drift apart.
grant execute on function public.can_access_sales() to authenticated;

-- Who a lead can be assigned to --------------------------------------------

-- A salesperson needs colleagues' names to hand a lead over, but must not be
-- given read access to `seats`, where the salaries live. This view exposes the
-- three columns an owner picker needs and nothing else.
--
-- It is intentionally not `security_invoker`: it runs as its owner and so is
-- not filtered by the policies on `seats` and `managers`. The `where` clause
-- below is what takes their place — no rows come out at all unless the caller
-- passes the same check that guards the sales tables themselves.
create or replace view public.sales_owner_options as
select
  'manager'::text as source,
  lower(managers.email) as email,
  managers.name as name
from public.managers
where public.can_access_sales()
  and managers.status <> 'inactive'
  and coalesce(managers.email, '') <> ''
union all
select
  'seat'::text as source,
  lower(seats.login_email) as email,
  seats.name as name
from public.seats
where public.can_access_sales()
  and seats.status = 'active'
  and coalesce(seats.login_email, '') <> '';

revoke all on public.sales_owner_options from anon;
grant select on public.sales_owner_options to authenticated;

-- Access to the titles themselves ------------------------------------------

alter table public.job_titles enable row level security;
alter table public.seat_titles enable row level security;

-- The catalogue is names of jobs: readable by anyone signed in, since the
-- sales owner picker and an employee's own profile both need it. Only managers
-- may write, because `grants_sales_access` is an access control.
drop policy if exists "Authenticated read job titles" on public.job_titles;
create policy "Authenticated read job titles"
on public.job_titles
for select
to authenticated
using (true);

drop policy if exists "Managers manage job titles" on public.job_titles;
create policy "Managers manage job titles"
on public.job_titles
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Managers manage seat titles" on public.seat_titles;
create policy "Managers manage seat titles"
on public.seat_titles
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- An employee has to be able to read their own titles: it is how the app works
-- out whether to show them Sales at all.
drop policy if exists "Employees read own titles" on public.seat_titles;
create policy "Employees read own titles"
on public.seat_titles
for select
to authenticated
using (public.is_employee_self(seat_id));

revoke all on public.job_titles from anon;
revoke all on public.seat_titles from anon;

grant select, insert, update, delete on public.job_titles to authenticated;
grant select, insert, update, delete on public.seat_titles to authenticated;
grant usage, select on sequence public.job_titles_id_seq to authenticated;
grant usage, select on sequence public.seat_titles_id_seq to authenticated;

-- Seed ---------------------------------------------------------------------

-- The titles an agency this size actually uses. Ordinary rows: rename them,
-- delete them, add your own. Only the two business development ones open the
-- sales module, and that can be changed on any of them.
insert into public.job_titles (name, grants_sales_access, is_seeded)
values
  ('Software Engineer', false, true),
  ('Senior Software Engineer', false, true),
  ('Tech Lead', false, true),
  ('QA Engineer', false, true),
  ('UI/UX Designer', false, true),
  ('Project Manager', false, true),
  ('Business Developer', true, true),
  ('Sales Executive', true, true)
on conflict (name) do nothing;

-- Anyone whose designation already matches a seeded title starts out holding
-- it, so the titles list does not open empty on every existing employee.
insert into public.seat_titles (seat_id, job_title_id, assigned_by_email)
select seats.id, job_titles.id, ''
from public.seats
join public.job_titles
  on lower(job_titles.name) = lower(trim(coalesce(seats.designation, '')))
on conflict (seat_id, job_title_id) do nothing;
