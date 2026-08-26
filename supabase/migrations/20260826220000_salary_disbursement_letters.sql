-- A letter that reconciles a payslip against a bank statement.
--
-- Salaries here are often paid in two instalments, and for a month that is
-- dispatched after it ends. So a payslip for May showing one net figure of
-- 161,800 is checked against a statement showing 80,900 on 2 June and 80,900
-- on 22 June — three mismatches at once: the count, the amounts, and the
-- month. Banks and employers reject both documents on that basis.
--
-- The letter states the same facts the statement shows: what the month's net
-- salary was, how many instalments it went out in, and on which dates.
--
-- Nothing on it is typed. Every instalment is read from `salary_sheets` and
-- `salary_sheet_items`, which are the dispatch letters actually sent to the
-- bank, so the letter cannot claim a payment the company did not make. That is
-- what makes it safe to let an employee issue their own.

create table if not exists public.salary_disbursement_letters (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  issued_on date not null default current_date,
  -- Snapshot of the seat, for the same reason the payslip keeps one.
  employee_name text not null,
  designation text not null default '',
  cnic text not null default '',
  account_number text not null default '',
  bank_name text not null default '',
  date_of_joining date,
  -- The instalments as they stood when the letter was issued: an array of
  -- {paid_on, amount, sheet_type}. Kept rather than re-read so a letter already
  -- handed to a bank does not change if a dispatch sheet is later corrected.
  instalments jsonb not null default '[]'::jsonb,
  total_paid numeric(12, 2) not null default 0,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  unique (seat_id, month, year)
);

create index if not exists salary_disbursement_letters_seat_idx
on public.salary_disbursement_letters (seat_id, year desc, month desc);

alter table public.salary_disbursement_letters enable row level security;

drop policy if exists "Managers manage disbursement letters"
on public.salary_disbursement_letters;
create policy "Managers manage disbursement letters"
on public.salary_disbursement_letters
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Employees read own disbursement letters"
on public.salary_disbursement_letters;
create policy "Employees read own disbursement letters"
on public.salary_disbursement_letters
for select
to authenticated
using (public.is_employee_self(seat_id));

drop policy if exists "Employees delete own disbursement letters"
on public.salary_disbursement_letters;
create policy "Employees delete own disbursement letters"
on public.salary_disbursement_letters
for delete
to authenticated
using (public.is_employee_self(seat_id));

revoke all on public.salary_disbursement_letters from anon;
grant select, delete on public.salary_disbursement_letters to authenticated;
grant usage, select
on sequence public.salary_disbursement_letters_id_seq to authenticated;

-- What the app knows about one person's pay for one month: every dispatch that
-- included them, oldest first. Exposed as a function so the create form can
-- show the instalments before anything is written, reading exactly what the
-- letter will.
create or replace function public.get_salary_disbursements(
  target_seat_id bigint,
  target_month integer,
  target_year integer
)
returns table (paid_on date, amount numeric, sheet_type text)
language sql
stable
security definer
set search_path = public
as $$
  select sheet.issued_on, item.net_salary, sheet.sheet_type
  from public.salary_sheet_items item
  join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
  where item.seat_id = target_seat_id
    and sheet.month = target_month
    and sheet.year = target_year
    and (public.is_manager() or public.is_employee_self(target_seat_id))
  order by sheet.issued_on, sheet.id;
$$;

-- Issue the letter for one month. Callable by the seat's own occupant or by a
-- manager. The bank name is the only thing a caller may supply, and only
-- because it describes the employee's own account rather than the company's
-- payments; it falls back to the seat.
create or replace function public.generate_salary_disbursement_letter(
  target_seat_id bigint,
  letter_month integer,
  letter_year integer,
  letter_bank_name text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_record public.seats%rowtype;
  new_letter_id bigint;
  collected jsonb;
  paid_total numeric(12, 2);
begin
  if letter_month < 1 or letter_month > 12 then
    raise exception 'month must be between 1 and 12';
  end if;

  select * into seat_record from public.seats where id = target_seat_id;
  if not found then
    raise exception 'employee not found';
  end if;

  if not (public.is_manager() or public.is_employee_self(target_seat_id)) then
    raise exception 'not allowed to issue a letter for this employee';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'paid_on', sheet.issued_on,
          'amount', item.net_salary,
          'sheet_type', sheet.sheet_type
        )
        order by sheet.issued_on, sheet.id
      ),
      '[]'::jsonb
    ),
    coalesce(sum(item.net_salary), 0)
  into collected, paid_total
  from public.salary_sheet_items item
  join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
  where item.seat_id = target_seat_id
    and sheet.month = letter_month
    and sheet.year = letter_year;

  -- Without a dispatch on record there is nothing to confirm, and a letter
  -- asserting a payment that cannot be evidenced is the opposite of the point.
  if jsonb_array_length(collected) = 0 then
    raise exception 'no salary dispatch is on record for that month';
  end if;

  -- Re-issuing replaces, so the letter can be regenerated after a dispatch
  -- sheet is corrected.
  delete from public.salary_disbursement_letters
  where seat_id = target_seat_id and month = letter_month and year = letter_year;

  insert into public.salary_disbursement_letters (
    seat_id, month, year, issued_on, employee_name, designation, cnic,
    account_number, bank_name, date_of_joining, instalments, total_paid,
    created_by_email
  )
  values (
    target_seat_id, letter_month, letter_year, current_date, seat_record.name,
    coalesce(seat_record.designation, ''), coalesce(seat_record.cnic, ''),
    coalesce(seat_record.account_number, ''),
    coalesce(
      nullif(btrim(letter_bank_name), ''),
      nullif(btrim(seat_record.bank_name), ''),
      ''
    ),
    seat_record.date_of_joining, collected, paid_total,
    coalesce(public.current_auth_email(), '')
  )
  returning id into new_letter_id;

  return new_letter_id;
end;
$$;

grant execute on function public.get_salary_disbursements(bigint, integer, integer)
to authenticated;
grant execute on function public.generate_salary_disbursement_letter(
  bigint, integer, integer, text
) to authenticated;
