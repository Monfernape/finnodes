-- Salary-document revisions from payroll feedback.
--
-- Salary slip
--   * Bank name and office address fall back to the company's own details when
--     neither the form nor the seat record carries them, so a slip never prints
--     a bare "-" for either.
--   * The partial-disbursement note reads with ordinal dates and no year
--     ("... on 7th August and ... on 21st August"), matching how the figures
--     are quoted in conversation and on the letter.
--
-- Salary disbursement letter
--   * It is now a prose certificate rather than a reconciliation table. It
--     states the monthly gross, income tax and net, and that the net is paid in
--     equal transactions. The three figures are snapshotted onto the letter the
--     same way the payslip snapshots its own, so a letter already handed to a
--     bank does not move if the seat is edited afterwards.

-- The monthly figures the letter now quotes in prose. Snapshotted at issue.
alter table public.salary_disbursement_letters
  add column if not exists gross_salary numeric(12, 2) not null default 0,
  add column if not exists income_tax numeric(12, 2) not null default 0,
  add column if not exists net_salary numeric(12, 2) not null default 0;

-- Ordinal day, no year. The `th` pattern picks the suffix from the number, so
-- the 1st, 2nd and 3rd of a month are not written "1th".
create or replace function public.build_disbursement_summary(
  target_seat_id bigint,
  target_month integer,
  target_year integer
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  part_count integer;
begin
  select array_agg(
    'PKR ' || to_char(item.net_salary, 'FM999,999,990')
      || ' on ' || to_char(sheet.issued_on, 'FMDDth FMMonth')
    order by sheet.issued_on, sheet.id
  )
  into parts
  from public.salary_sheet_items item
  join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
  where item.seat_id = target_seat_id
    and sheet.month = target_month
    and sheet.year = target_year;

  part_count := coalesce(array_length(parts, 1), 0);
  if part_count < 2 then
    return '';
  end if;

  -- "a and b" for two, "a, b and c" for more, which is how the sentence reads
  -- aloud rather than a bare comma list.
  return to_char(make_date(target_year, target_month, 1), 'FMMonth')
    || ' salary was disbursed as '
    || array_to_string(parts[1:part_count - 1], ', ')
    || ' and ' || parts[part_count] || '.';
end;
$$;

-- Definer helper that returns any seat's pay dates with no check on the caller;
-- kept an internal helper only, the way the earlier migration set it up.
revoke all on function public.build_disbursement_summary(bigint, integer, integer)
from public;

-- Same signature and body as before, with two fallbacks changed: bank name and
-- office address now land on the company's own details rather than an empty
-- string when nothing else is on record.
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
  final_summary text;
  final_slip_type text;
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

  -- What the caller typed wins, then whatever the seat carries, and only then
  -- the company default, so a slip always prints a real bank and office even
  -- for a record that never had either filled in.
  final_bank_name := coalesce(
    nullif(btrim(slip_bank_name), ''),
    nullif(btrim(seat_record.bank_name), ''),
    'Bank Alfalah Gulshan Market Branch'
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
    'House No. 349/J-10, Ahmad Park Ahmed Park Colony, Multan, 60650'
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

  -- Derived, not chosen: two or more dispatches on record make this a partial
  -- payslip and give it its explanatory line.
  final_summary := public.build_disbursement_summary(
    target_seat_id, slip_month, slip_year
  );
  final_slip_type := case when final_summary = '' then 'full' else 'partial' end;

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
    income_tax, tax_paid, note, slip_type, disbursement_summary,
    created_by_email
  )
  values (
    target_seat_id, slip_month, slip_year, current_date, seat_record.name,
    coalesce(seat_record.designation, ''), seat_record.date_of_joining,
    coalesce(seat_record.gross_salary, 0), coalesce(seat_record.net_salary, 0),
    deductions, final_account_number, final_bank_name, final_cnic,
    final_employment_status, final_office_location,
    -- The only deduction the app models is income tax, so the tax paid this
    -- month is that same figure.
    deductions, deductions, final_note, final_slip_type, final_summary,
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

-- Same signature as before; the body now snapshots the monthly gross, tax and
-- net onto the letter, which the prose certificate quotes.
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
  snap_gross numeric(12, 2);
  snap_net numeric(12, 2);
  snap_tax numeric(12, 2);
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

  -- The monthly figures, taken from the seat the same way the payslip takes
  -- them. Tax is the gap between gross and net, the only deduction the app
  -- models.
  snap_gross := coalesce(seat_record.gross_salary, 0);
  snap_net := coalesce(seat_record.net_salary, 0);
  snap_tax := greatest(snap_gross - snap_net, 0);

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
    gross_salary, income_tax, net_salary, created_by_email
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
    snap_gross, snap_tax, snap_net,
    coalesce(public.current_auth_email(), '')
  )
  returning id into new_letter_id;

  return new_letter_id;
end;
$$;

grant execute on function public.generate_salary_disbursement_letter(
  bigint, integer, integer, text
) to authenticated;

-- Existing partial payslips carry the old "7 August 2026" wording; re-derive
-- their note so every slip reads the same way.
update public.salary_slips
set disbursement_summary = public.build_disbursement_summary(seat_id, month, year)
where slip_type = 'partial';

-- Letters issued before this migration have no monthly figures on them. Best
-- effort: take them from the seat as it stands now, the same source a fresh
-- letter would use.
update public.salary_disbursement_letters letter
set
  gross_salary = coalesce(seat.gross_salary, 0),
  net_salary = coalesce(seat.net_salary, 0),
  income_tax = greatest(
    coalesce(seat.gross_salary, 0) - coalesce(seat.net_salary, 0), 0
  )
from public.seats seat
where seat.id = letter.seat_id
  and letter.gross_salary = 0
  and letter.income_tax = 0
  and letter.net_salary = 0;
