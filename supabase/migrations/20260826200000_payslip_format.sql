-- The salary slip becomes a payslip.
--
-- The old document was a certificate addressed to a bank: a paragraph of prose
-- naming a recipient and a purpose, with the figures underneath. The new one is
-- the payslip proper — employee details, then earnings, deductions and tax in
-- three columns, then a note and a signature line.
--
-- That needs a few facts the seat record never held: which bank the salary goes
-- to, whether the person is permanent, and which office they sit in. They are
-- added to the seat so a manager can set them once, and can also be supplied
-- per slip for anyone whose record does not have them yet — which is what lets
-- an employee issue their own payslip without waiting on anybody.
--
-- `recipient_name`, `purpose` and `contact_number` are left on the table. They
-- are not printed any more, but slips already issued keep what they were made
-- with rather than silently losing it.

alter table public.seats
add column if not exists bank_name text,
add column if not exists office_location text,
-- Defaulted rather than nullable: every seat is something, and 'Permanent' is
-- what the overwhelming majority are.
add column if not exists employment_status text not null default 'Permanent';

alter table public.salary_slips
-- Snapshots, for the same reason the name and salary are snapshots: a payslip
-- handed over months ago must keep reading the way it did when it was issued.
add column if not exists account_number text not null default '',
add column if not exists bank_name text not null default '',
add column if not exists cnic text not null default '',
add column if not exists employment_status text not null default '',
add column if not exists office_location text not null default '',
-- Split out from `total_deductions` so the Tax Details column has its own
-- figure to print, and stays right if a non-tax deduction is ever added.
add column if not exists income_tax numeric(12, 2) not null default 0,
add column if not exists tax_paid numeric(12, 2) not null default 0,
add column if not exists note text not null default '';

-- The signature changes rather than gaining defaults, so the old one goes.
drop function if exists public.generate_salary_slip(
  bigint, integer, integer, text, text, text
);

-- Issue a payslip for one month. Callable by the seat's own occupant or by a
-- manager.
--
-- Every figure is still read from the seat, so the caller cannot influence what
-- the payslip says about their pay. What an employee may now supply is limited
-- to facts about themselves that the company has no record of yet — their bank,
-- their account, their CNIC, their office.
--
-- Employment status and the note stay manager-only. Both are assertions the
-- company is making on a signed document rather than facts about the employee,
-- and the note in particular is free text on a page carrying the letterhead.
create or replace function public.generate_salary_slip(
  target_seat_id bigint,
  slip_month integer,
  slip_year integer,
  slip_bank_name text default '',
  slip_account_number text default '',
  slip_cnic text default '',
  slip_office_location text default '',
  slip_employment_status text default '',
  slip_note text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_record public.seats%rowtype;
  new_slip_id bigint;
  caller_is_manager boolean;
  allowances numeric(12, 2);
  basic_pay numeric(12, 2);
  deductions numeric(12, 2);
  next_sort integer := 0;
  final_bank_name text;
  final_account_number text;
  final_cnic text;
  final_office_location text;
  final_employment_status text;
  final_note text;
begin
  if slip_month < 1 or slip_month > 12 then
    raise exception 'month must be between 1 and 12';
  end if;

  select * into seat_record from public.seats where id = target_seat_id;
  if not found then
    raise exception 'employee not found';
  end if;

  caller_is_manager := public.is_manager();
  if not (caller_is_manager or public.is_employee_self(target_seat_id)) then
    raise exception 'not allowed to issue a payslip for this employee';
  end if;

  -- What the caller typed wins only where the record has nothing, so a manager
  -- keeping the seat up to date means nobody retypes anything.
  final_bank_name := coalesce(
    nullif(btrim(slip_bank_name), ''), nullif(btrim(seat_record.bank_name), ''), ''
  );
  final_account_number := coalesce(
    nullif(btrim(slip_account_number), ''),
    nullif(btrim(seat_record.account_number), ''),
    ''
  );
  final_cnic := coalesce(
    nullif(btrim(slip_cnic), ''), nullif(btrim(seat_record.cnic), ''), ''
  );
  final_office_location := coalesce(
    nullif(btrim(slip_office_location), ''),
    nullif(btrim(seat_record.office_location), ''),
    ''
  );

  if caller_is_manager then
    final_employment_status := coalesce(
      nullif(btrim(slip_employment_status), ''),
      nullif(btrim(seat_record.employment_status), ''),
      'Permanent'
    );
    final_note := coalesce(btrim(slip_note), '');
  else
    -- An employee gets whatever the record says and no note at all.
    final_employment_status := coalesce(
      nullif(btrim(seat_record.employment_status), ''), 'Permanent'
    );
    final_note := '';
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

  -- Re-issuing a month replaces the previous payslip rather than erroring, so
  -- it can be regenerated after a manager corrects the seat record.
  delete from public.salary_slips
  where seat_id = target_seat_id and month = slip_month and year = slip_year;

  insert into public.salary_slips (
    seat_id, month, year, issued_on, employee_name, designation,
    date_of_joining, gross_salary, net_salary, total_deductions,
    account_number, bank_name, cnic, employment_status, office_location,
    income_tax, tax_paid, note, created_by_email
  )
  values (
    target_seat_id, slip_month, slip_year, current_date, seat_record.name,
    coalesce(seat_record.designation, ''), seat_record.date_of_joining,
    coalesce(seat_record.gross_salary, 0), coalesce(seat_record.net_salary, 0),
    deductions, final_account_number, final_bank_name, final_cnic,
    final_employment_status, final_office_location,
    -- The only deduction the app models is income tax, so the tax paid this
    -- month is that same figure.
    deductions, deductions, final_note,
    coalesce(public.current_auth_email(), '')
  )
  returning id into new_slip_id;

  insert into public.salary_slip_lines (salary_slip_id, line_type, label, amount, sort_order)
  values (new_slip_id, 'earning', 'Basic', basic_pay, next_sort);
  next_sort := next_sort + 1;

  -- Allowances only appear when they carry an amount, so a payslip for someone
  -- on a flat salary stays as short as the reference one.
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
    values (new_slip_id, 'deduction', 'Income Tax', deductions, 0);
  end if;

  return new_slip_id;
end;
$$;

grant execute on function public.generate_salary_slip(
  bigint, integer, integer, text, text, text, text, text, text
) to authenticated;

-- Payslips already issued predate these columns, so they are backfilled from
-- the seat rather than printing blank rows.
update public.salary_slips slip
set
  account_number = coalesce(nullif(btrim(seat.account_number), ''), ''),
  cnic = coalesce(nullif(btrim(seat.cnic), ''), ''),
  bank_name = coalesce(nullif(btrim(seat.bank_name), ''), ''),
  office_location = coalesce(nullif(btrim(seat.office_location), ''), ''),
  employment_status = coalesce(nullif(btrim(seat.employment_status), ''), 'Permanent'),
  income_tax = slip.total_deductions,
  tax_paid = slip.total_deductions
from public.seats seat
where seat.id = slip.seat_id
  and slip.employment_status = '';
