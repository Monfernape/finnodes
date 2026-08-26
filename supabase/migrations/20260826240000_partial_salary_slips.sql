-- A payslip now knows whether the month it covers was paid in one go or in
-- instalments, and says so on the page.
--
-- This is the same problem the disbursement letter solves, met one step
-- earlier: a payslip showing a single net figure of 161,800 for May cannot be
-- reconciled against a statement showing 80,900 on 2 June and 80,900 on 22
-- June. The letter is the full reconciliation; this is the one line on the
-- payslip itself that stops the reader being surprised in the first place.
--
-- The type is derived, never chosen. It comes from counting the dispatches the
-- company actually sent to the bank for that month, so a payslip cannot claim
-- to be a full payment when it was not, and nobody has to remember to mark it.

alter table public.salary_slips
add column if not exists slip_type text not null default 'full'
  check (slip_type in ('full', 'partial')),
-- The generated one-liner, e.g. "May salary was disbursed as PKR 80,900 on
-- 2 June 2026 and PKR 80,900 on 22 June 2026." Empty on a full payslip.
add column if not exists disbursement_summary text not null default '';

create index if not exists salary_slips_seat_type_idx
on public.salary_slips (seat_id, slip_type);

-- Builds the sentence from the dispatches on record. Returns empty when the
-- month went out in one payment, or when no dispatch is on record at all —
-- in both cases there is nothing for a payslip to explain.
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
      || ' on ' || to_char(sheet.issued_on, 'FMDD FMMonth YYYY')
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

grant execute on function public.build_disbursement_summary(bigint, integer, integer)
to authenticated;

-- Same signature as before; only the body changes, to stamp the type and the
-- summary onto the payslip it writes.
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

-- Payslips issued before the split are classified from the same records, so an
-- existing partial month is not left looking like a full payment.
update public.salary_slips slip
set
  disbursement_summary = public.build_disbursement_summary(
    slip.seat_id, slip.month, slip.year
  ),
  slip_type = case
    when public.build_disbursement_summary(slip.seat_id, slip.month, slip.year) = ''
      then 'full'
    else 'partial'
  end
where slip.disbursement_summary = '';
