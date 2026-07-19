create or replace function public.current_auth_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails
    where lower(email) = public.current_auth_email()
  );
$$;

create or replace function public.is_employee_self(target_seat_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.seats
    where id = target_seat_id
      and people_status = 'active'
      and (
        auth_user_id = auth.uid()
        or (
          auth_user_id is null
          and lower(login_email) = public.current_auth_email()
        )
      )
  );
$$;

create or replace function public.current_people_role()
returns text
language sql
stable
set search_path = public
as $$
  select case
    when public.is_manager() then 'manager'
    when exists (
      select 1
      from public.seats
      where people_status = 'active'
        and (
          auth_user_id = auth.uid()
          or (
            auth_user_id is null
            and lower(login_email) = public.current_auth_email()
          )
        )
    ) then 'employee'
    else null
  end;
$$;

alter table public.seats enable row level security;

drop policy if exists "Managers can manage seats" on public.seats;
create policy "Managers can manage seats"
on public.seats
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees can read their own seat" on public.seats;
create policy "Employees can read their own seat"
on public.seats
for select
to authenticated
using (public.is_employee_self(id));

drop policy if exists "Employees can read assigned peer review seats" on public.seats;
create policy "Employees can read assigned peer review seats"
on public.seats
for select
to authenticated
using (
  exists (
    select 1
    from public.feedback_requests fr
    where fr.subject_seat_id = seats.id
      and public.is_employee_self(fr.reviewer_seat_id)
      and fr.performance_review_id is not null
      and fr.status in ('requested', 'draft', 'submitted', 'published')
  )
);

drop policy if exists "Employees can claim their own seat" on public.seats;
create policy "Employees can claim their own seat"
on public.seats
for update
to authenticated
using (
  people_status = 'active'
  and auth_user_id is null
  and lower(login_email) = public.current_auth_email()
)
with check (
  people_status = 'active'
  and auth_user_id = auth.uid()
  and lower(login_email) = public.current_auth_email()
);

create table if not exists public.one_on_one_years (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  year integer not null check (year >= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seat_id, year)
);

create table if not exists public.one_on_ones (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  agenda jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  discussion_notes jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  status text not null default 'not_started' check (status in ('not_started', 'draft', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seat_id, year, month)
);

create table if not exists public.one_on_one_action_items (
  id bigserial primary key,
  one_on_one_id bigint not null references public.one_on_ones(id) on delete cascade,
  title text not null,
  owner_seat_id bigint references public.seats(id) on delete set null,
  owner_manager_email text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manager_private_notes (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  author_email text not null,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  linked_one_on_one_id bigint references public.one_on_ones(id) on delete set null,
  linked_project_assignment_id bigint,
  linked_review_cycle_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_cycles (
  id bigserial primary key,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.performance_reviews (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  review_cycle_id bigint not null references public.review_cycles(id) on delete cascade,
  manager_email text not null,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'submitted', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seat_id, review_cycle_id)
);

create table if not exists public.review_sections (
  id bigserial primary key,
  performance_review_id bigint not null references public.performance_reviews(id) on delete cascade,
  section_type text not null check (section_type in ('self_review', 'manager_review', 'manager_feedback', 'final_summary')),
  author_email text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published')),
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (performance_review_id, section_type)
);

create table if not exists public.feedback_requests (
  id bigserial primary key,
  subject_seat_id bigint not null references public.seats(id) on delete cascade,
  reviewer_seat_id bigint references public.seats(id) on delete set null,
  reviewer_email text,
  requested_by_manager_email text not null,
  performance_review_id bigint references public.performance_reviews(id) on delete set null,
  project_assignment_id bigint,
  prompt_set jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  anonymous_to_employee boolean not null default true,
  visible_to_employee boolean not null default false,
  status text not null default 'requested' check (status in ('requested', 'draft', 'submitted', 'published', 'cancelled')),
  due_date date,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  name text not null,
  role text,
  manager_lead_email text not null,
  starts_on date,
  ends_on date,
  status text not null default 'current' check (status in ('current', 'past')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.one_on_one_years enable row level security;
alter table public.one_on_ones enable row level security;
alter table public.one_on_one_action_items enable row level security;
alter table public.manager_private_notes enable row level security;
alter table public.review_cycles enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.review_sections enable row level security;
alter table public.feedback_requests enable row level security;
alter table public.project_assignments enable row level security;

create or replace function public.employee_can_access_one_on_one(target_one_on_one_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.one_on_ones
    where id = target_one_on_one_id
      and public.is_employee_self(seat_id)
  );
$$;

create or replace function public.employee_can_access_review(target_review_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.performance_reviews
    where id = target_review_id
      and public.is_employee_self(seat_id)
  );
$$;

drop policy if exists "Managers manage one on one years" on public.one_on_one_years;
create policy "Managers manage one on one years"
on public.one_on_one_years
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own one on one years" on public.one_on_one_years;
create policy "Employees read own one on one years"
on public.one_on_one_years
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Managers manage one on ones" on public.one_on_ones;
create policy "Managers manage one on ones"
on public.one_on_ones
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own one on ones" on public.one_on_ones;
create policy "Employees read own one on ones"
on public.one_on_ones
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Employees update own one on one agenda" on public.one_on_ones;
create policy "Employees update own one on one agenda"
on public.one_on_ones
for update
to authenticated
using (public.is_employee_self(seat_id))
with check (public.is_employee_self(seat_id));

drop policy if exists "Employees create own one on one agenda" on public.one_on_ones;
create policy "Employees create own one on one agenda"
on public.one_on_ones
for insert
to authenticated
with check (public.is_employee_self(seat_id));

create or replace function public.prevent_employee_one_on_one_protected_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_manager() then
    return new;
  end if;

  if new.discussion_notes is distinct from old.discussion_notes
    or new.status is distinct from old.status
    or new.seat_id is distinct from old.seat_id
    or new.year is distinct from old.year
    or new.month is distinct from old.month then
    raise exception 'employees can only update agenda';
  end if;

  return new;
end;
$$;

drop trigger if exists one_on_ones_employee_update_guard on public.one_on_ones;
create trigger one_on_ones_employee_update_guard
before update on public.one_on_ones
for each row
execute function public.prevent_employee_one_on_one_protected_updates();

drop policy if exists "Managers manage action items" on public.one_on_one_action_items;
create policy "Managers manage action items"
on public.one_on_one_action_items
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own action items" on public.one_on_one_action_items;
create policy "Employees read own action items"
on public.one_on_one_action_items
for select
to authenticated
using (public.employee_can_access_one_on_one(one_on_one_id));

drop policy if exists "Managers manage private notes" on public.manager_private_notes;
create policy "Managers manage private notes"
on public.manager_private_notes
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Managers manage review cycles" on public.review_cycles;
create policy "Managers manage review cycles"
on public.review_cycles
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read active review cycles" on public.review_cycles;
create policy "Employees read active review cycles"
on public.review_cycles
for select
to authenticated
using (status in ('active', 'closed'));

drop policy if exists "Managers manage performance reviews" on public.performance_reviews;
create policy "Managers manage performance reviews"
on public.performance_reviews
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own performance reviews" on public.performance_reviews;
create policy "Employees read own performance reviews"
on public.performance_reviews
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Managers manage review sections" on public.review_sections;
create policy "Managers manage review sections"
on public.review_sections
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own review sections" on public.review_sections;
create policy "Employees read own review sections"
on public.review_sections
for select
to authenticated
using (
  public.employee_can_access_review(performance_review_id)
  and (
    section_type in ('self_review', 'manager_feedback')
    or status = 'published'
  )
);

drop policy if exists "Employees write own review sections" on public.review_sections;
create policy "Employees write own review sections"
on public.review_sections
for insert
to authenticated
with check (
  public.employee_can_access_review(performance_review_id)
  and section_type in ('self_review', 'manager_feedback')
  and author_email = public.current_auth_email()
);

drop policy if exists "Employees update own draft review sections" on public.review_sections;
create policy "Employees update own draft review sections"
on public.review_sections
for update
to authenticated
using (
  public.employee_can_access_review(performance_review_id)
  and section_type in ('self_review', 'manager_feedback')
  and author_email = public.current_auth_email()
  and status = 'draft'
)
with check (
  public.employee_can_access_review(performance_review_id)
  and section_type in ('self_review', 'manager_feedback')
  and author_email = public.current_auth_email()
  and status in ('draft', 'submitted')
);

create or replace function public.prevent_submitted_review_section_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'submitted' and not public.is_manager() then
    raise exception 'submitted reviews are locked';
  end if;

  if new.status = 'submitted' and old.submitted_at is null then
    new.submitted_at = now();
  end if;

  if new.status = 'published' and old.published_at is null then
    new.published_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists review_sections_lock_guard on public.review_sections;
create trigger review_sections_lock_guard
before update on public.review_sections
for each row
execute function public.prevent_submitted_review_section_updates();

drop policy if exists "Managers manage feedback requests" on public.feedback_requests;
create policy "Managers manage feedback requests"
on public.feedback_requests
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read assigned feedback requests" on public.feedback_requests;
create policy "Employees read assigned feedback requests"
on public.feedback_requests
for select
to authenticated
using (
  public.is_employee_self(reviewer_seat_id)
  or (
    public.is_employee_self(subject_seat_id)
    and visible_to_employee
  )
);

drop policy if exists "Employees update assigned feedback requests" on public.feedback_requests;
create policy "Employees update assigned feedback requests"
on public.feedback_requests
for update
to authenticated
using (
  public.is_employee_self(reviewer_seat_id)
  and status in ('requested', 'draft')
)
with check (
  public.is_employee_self(reviewer_seat_id)
  and status in ('draft', 'submitted')
);

drop policy if exists "Managers manage project assignments" on public.project_assignments;
create policy "Managers manage project assignments"
on public.project_assignments
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own project assignments" on public.project_assignments;
create policy "Employees read own project assignments"
on public.project_assignments
for select
to authenticated
using (public.is_employee_self(seat_id));
