-- Salary slips and experience letters that an employee issues for themselves.
--
-- Both documents are addressed to outside parties (a bank, a future employer),
-- so nothing an employee types may end up as a factual claim on them. Every
-- number and every personal detail is derived from the seat record, which only
-- managers can edit, and the two `generate_*` functions below are the sole way
-- to create a document. The employee supplies context only: which month, which
-- bank, which technologies to describe.

-- Allowances break the seat's gross salary into the lines a slip prints.
-- Basic pay is deliberately not stored: it is gross minus these, so the
-- earnings on a slip always total the gross salary the rest of the app uses.
alter table public.seats
add column if not exists utility_allowance numeric(12, 2) not null default 0,
add column if not exists fuel_allowance numeric(12, 2) not null default 0,
add column if not exists meal_allowance numeric(12, 2) not null default 0,
add column if not exists other_allowance numeric(12, 2) not null default 0;

create table if not exists public.salary_slips (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  issued_on date not null default current_date,
  -- Snapshot of the seat at issue time. A slip handed to a bank must keep
  -- reading the same way after a raise or a change of title.
  employee_name text not null,
  designation text not null default '',
  contact_number text not null default '',
  date_of_joining date,
  gross_salary numeric(12, 2) not null default 0,
  net_salary numeric(12, 2) not null default 0,
  total_deductions numeric(12, 2) not null default 0,
  -- Why the slip was asked for. This is the only narrative the employee
  -- controls, and it names the recipient rather than asserting anything.
  recipient_name text not null default '',
  purpose text not null default '',
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  unique (seat_id, month, year)
);

create table if not exists public.salary_slip_lines (
  id bigserial primary key,
  salary_slip_id bigint not null references public.salary_slips(id) on delete cascade,
  line_type text not null check (line_type in ('earning', 'deduction')),
  label text not null,
  amount numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists salary_slips_seat_id_idx on public.salary_slips (seat_id);
create index if not exists salary_slip_lines_slip_id_idx
on public.salary_slip_lines (salary_slip_id);

create table if not exists public.experience_letters (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  issued_on date not null default current_date,
  -- Snapshot of the seat, for the same reason the slip keeps one.
  employee_name text not null,
  designation text not null default '',
  date_of_joining date,
  -- Set when the person has left, which switches the letter from "is currently
  -- serving" to a closed tenure.
  served_until date,
  -- Technology slugs only. The letter's prose is composed from these at render
  -- time, so there is no free text on the letter for anyone to edit.
  technologies jsonb not null default '[]'::jsonb,
  mentions_client boolean not null default true,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  check (served_until is null or date_of_joining is null or served_until >= date_of_joining)
);

create index if not exists experience_letters_seat_id_idx
on public.experience_letters (seat_id);

alter table public.salary_slips enable row level security;
alter table public.salary_slip_lines enable row level security;
alter table public.experience_letters enable row level security;

-- Documents are read-only to their owner. Creating one goes through the
-- generate_* functions, which is why no insert or update policy is granted to
-- employees here: the functions run as definer and bypass these rules.
drop policy if exists "Managers read salary slips" on public.salary_slips;
create policy "Managers read salary slips"
on public.salary_slips
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own salary slips" on public.salary_slips;
create policy "Employees read own salary slips"
on public.salary_slips
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Employees delete own salary slips" on public.salary_slips;
create policy "Employees delete own salary slips"
on public.salary_slips
for delete
to authenticated
using (public.is_employee_self(seat_id));

create or replace function public.can_access_salary_slip(target_slip_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.salary_slips
    where id = target_slip_id
      and (public.is_manager() or public.is_employee_self(seat_id))
  );
$$;

drop policy if exists "Managers read salary slip lines" on public.salary_slip_lines;
create policy "Managers read salary slip lines"
on public.salary_slip_lines
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own salary slip lines" on public.salary_slip_lines;
create policy "Employees read own salary slip lines"
on public.salary_slip_lines
for select
to authenticated
using (public.can_access_salary_slip(salary_slip_id));

drop policy if exists "Managers read experience letters" on public.experience_letters;
create policy "Managers read experience letters"
on public.experience_letters
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own experience letters" on public.experience_letters;
create policy "Employees read own experience letters"
on public.experience_letters
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Employees delete own experience letters" on public.experience_letters;
create policy "Employees delete own experience letters"
on public.experience_letters
for delete
to authenticated
using (public.is_employee_self(seat_id));

grant select, delete on public.salary_slips to authenticated;
grant select on public.salary_slip_lines to authenticated;
grant select, delete on public.experience_letters to authenticated;
grant insert, update on public.salary_slips to authenticated;
grant insert, update on public.salary_slip_lines to authenticated;
grant insert, update on public.experience_letters to authenticated;
grant usage, select on sequence public.salary_slips_id_seq to authenticated;
grant usage, select on sequence public.salary_slip_lines_id_seq to authenticated;
grant usage, select on sequence public.experience_letters_id_seq to authenticated;

-- Issue a salary slip for one month. Callable by the seat's own occupant or by
-- a manager; every figure is read from the seat, so the caller cannot influence
-- what the slip says about their pay.
create or replace function public.generate_salary_slip(
  target_seat_id bigint,
  slip_month integer,
  slip_year integer,
  slip_recipient_name text default '',
  slip_purpose text default '',
  slip_contact_number text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_record public.seats%rowtype;
  new_slip_id bigint;
  allowances numeric(12, 2);
  basic_pay numeric(12, 2);
  deductions numeric(12, 2);
  next_sort integer := 0;
begin
  if slip_month < 1 or slip_month > 12 then
    raise exception 'month must be between 1 and 12';
  end if;

  select * into seat_record from public.seats where id = target_seat_id;
  if not found then
    raise exception 'employee not found';
  end if;

  if not (public.is_manager() or public.is_employee_self(target_seat_id)) then
    raise exception 'not allowed to issue a salary slip for this employee';
  end if;

  allowances := coalesce(seat_record.utility_allowance, 0)
    + coalesce(seat_record.fuel_allowance, 0)
    + coalesce(seat_record.meal_allowance, 0)
    + coalesce(seat_record.other_allowance, 0);
  -- Basic pay is whatever the allowances do not account for, so the earnings
  -- always add up to the gross salary on the seat.
  basic_pay := greatest(coalesce(seat_record.gross_salary, 0) - allowances, 0);
  deductions := greatest(
    coalesce(seat_record.gross_salary, 0) - coalesce(seat_record.net_salary, 0),
    0
  );

  -- Re-issuing a month replaces the previous slip rather than erroring, so a
  -- slip can be regenerated after a manager corrects the seat record.
  delete from public.salary_slips
  where seat_id = target_seat_id and month = slip_month and year = slip_year;

  insert into public.salary_slips (
    seat_id, month, year, issued_on, employee_name, designation,
    contact_number, date_of_joining, gross_salary, net_salary,
    total_deductions, recipient_name, purpose, created_by_email
  )
  values (
    target_seat_id, slip_month, slip_year, current_date, seat_record.name,
    coalesce(seat_record.designation, ''), coalesce(slip_contact_number, ''),
    seat_record.date_of_joining, coalesce(seat_record.gross_salary, 0),
    coalesce(seat_record.net_salary, 0), deductions,
    coalesce(slip_recipient_name, ''), coalesce(slip_purpose, ''),
    coalesce(public.current_auth_email(), '')
  )
  returning id into new_slip_id;

  insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
  values (new_slip_id, 'earning', 'Basic Salary', basic_pay, next_sort);
  next_sort := next_sort + 1;

  -- Allowances only appear when they carry an amount, so a slip for someone on
  -- a flat salary stays as short as the reference one.
  if coalesce(seat_record.utility_allowance, 0) > 0 then
    insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
    values (new_slip_id, 'earning', 'Utility', seat_record.utility_allowance, next_sort);
    next_sort := next_sort + 1;
  end if;

  if coalesce(seat_record.fuel_allowance, 0) > 0 then
    insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
    values (new_slip_id, 'earning', 'Fuel Allowance', seat_record.fuel_allowance, next_sort);
    next_sort := next_sort + 1;
  end if;

  if coalesce(seat_record.meal_allowance, 0) > 0 then
    insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
    values (new_slip_id, 'earning', 'Meal', seat_record.meal_allowance, next_sort);
    next_sort := next_sort + 1;
  end if;

  if coalesce(seat_record.other_allowance, 0) > 0 then
    insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
    values (new_slip_id, 'earning', 'Other Allowance', seat_record.other_allowance, next_sort);
    next_sort := next_sort + 1;
  end if;

  if deductions > 0 then
    insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
    values (new_slip_id, 'deduction', 'Taxation', deductions, 0);
  end if;

  return new_slip_id;
end;
$$;

-- Issue an experience letter. The technology slugs decide the wording, which is
-- composed by the app at render time, so no prose is stored or submitted here.
create or replace function public.generate_experience_letter(
  target_seat_id bigint,
  letter_technologies jsonb default '[]'::jsonb,
  letter_mentions_client boolean default true,
  letter_served_until date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_record public.seats%rowtype;
  new_letter_id bigint;
begin
  if jsonb_typeof(letter_technologies) is distinct from 'array' then
    raise exception 'technologies must be an array';
  end if;

  select * into seat_record from public.seats where id = target_seat_id;
  if not found then
    raise exception 'employee not found';
  end if;

  if not (public.is_manager() or public.is_employee_self(target_seat_id)) then
    raise exception 'not allowed to issue an experience letter for this employee';
  end if;

  -- Only a manager can close out a tenure; an employee issuing their own letter
  -- always gets the "currently serving" wording.
  if letter_served_until is not null and not public.is_manager() then
    raise exception 'only a manager can set an end date on an experience letter';
  end if;

  insert into public.experience_letters (
    seat_id, issued_on, employee_name, designation, date_of_joining,
    served_until, technologies, mentions_client, created_by_email
  )
  values (
    target_seat_id, current_date, seat_record.name,
    coalesce(seat_record.designation, ''), seat_record.date_of_joining,
    letter_served_until, letter_technologies,
    coalesce(letter_mentions_client, true),
    coalesce(public.current_auth_email(), '')
  )
  returning id into new_letter_id;

  return new_letter_id;
end;
$$;

grant execute on function public.generate_salary_slip(bigint, integer, integer, text, text, text) to authenticated;
grant execute on function public.generate_experience_letter(bigint, jsonb, boolean, date) to authenticated;
grant execute on function public.can_access_salary_slip(bigint) to authenticated;
