-- Salary sheets record what left the bank, which is net pay. Only the July
-- 2025 letter printed a gross column; every later one printed net alone, and
-- the seed noted as much by mirroring net into `gross_salary`. The whole app
-- reads tax as the gap between the two, so a mirrored row reports no tax ever
-- withheld, and an annual tax salary slip comes out claiming a year of
-- untaxed salary — wrong, and wrong on a document filed with a tax return.
--
-- The missing figure is recoverable. Tax is a published function of gross pay,
-- so gross is the published function run backwards from the net that was
-- actually paid. Within one slab the tax is linear, which makes the inverse
-- exact rather than approximate:
--
--   net = G - (fixed + (G - lower) * rate) * (1 + surcharge)
--   G   = (net + (1 + surcharge) * fixed - k * lower) / (1 - k),
--         where k = (1 + surcharge) * rate
--
-- On the real sheets this lands on round salaries — 126,200 net a month comes
-- back as 130,000 gross with 3,800 withheld, 161,800 as 170,000 with 8,200 —
-- which is the arithmetic confirming these figures were always net.

-- Marks a row whose gross was reconstructed here rather than transcribed from
-- a letter, so the two are never confused, the backfill can be re-run after a
-- slab correction, and the app can say so where it matters.
alter table public.salary_sheet_items
add column if not exists gross_is_derived boolean not null default false;

-- The gross annual income that leaves `annual_net` after that year's tax.
-- Returns `annual_net` unchanged when no slab fits, which is the honest answer
-- for income under the exemption and the safe one for a year whose slabs have
-- not been entered: it claims no tax rather than inventing some.
create or replace function public.gross_up_annual_income(
  annual_net numeric,
  target_tax_year integer
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  slab record;
  year_record public.tax_years%rowtype;
  surcharge numeric;
  factor numeric;
  candidate numeric;
  owes_surcharge boolean;
begin
  if annual_net is null or annual_net <= 0 then
    return coalesce(annual_net, 0);
  end if;

  select * into year_record
  from public.tax_years
  where tax_year = target_tax_year;

  if not found then
    return annual_net;
  end if;

  for slab in
    select * from public.tax_slabs
    where tax_year_id = year_record.id
    order by sort_order
  loop
    -- The surcharge is charged on the tax, and only above a threshold on the
    -- income, so both answers are tried and the one that agrees with itself is
    -- kept. Trying it the other way round would need the gross the surcharge
    -- decision depends on, which is the thing being solved for.
    foreach surcharge in array array[0::numeric, coalesce(year_record.surcharge_rate, 0)::numeric]
    loop
      factor := (1 + surcharge / 100) * slab.rate_percent / 100;
      if factor >= 1 then
        continue;
      end if;

      candidate := (
        annual_net
        + (1 + surcharge / 100) * slab.fixed_amount
        - factor * slab.lower_limit
      ) / (1 - factor);

      owes_surcharge := year_record.surcharge_threshold is not null
        and candidate > year_record.surcharge_threshold;

      -- The candidate has to fall inside the slab it was solved for, and the
      -- surcharge it was solved with has to be the one that income owes.
      if candidate > slab.lower_limit
        and (slab.upper_limit is null or candidate <= slab.upper_limit)
        and owes_surcharge = (surcharge > 0)
      then
        return round(candidate, 2);
      end if;

      -- A year with no surcharge has nothing to try twice.
      if coalesce(year_record.surcharge_rate, 0) = 0 then
        exit;
      end if;
    end loop;
  end loop;

  return annual_net;
end;
$$;

-- A tax year runs July to June and is named after the year it ends in, so a
-- sheet lands in the tax year that contains its month. Mirrors
-- `getTaxYearForMonth`.
create or replace function public.tax_year_for_month(
  target_month integer,
  target_year integer
)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when target_month >= 7 then target_year + 1 else target_year end;
$$;

-- Fills in the gross pay behind every month that only ever recorded net.
--
-- Grouped by employee and month before anything is calculated: a month paid in
-- two dispatches is one month's income, and taxing each dispatch on its own
-- would annualise half a salary into a lower bracket. The month's gross is
-- then split back across its dispatches in the proportion they were paid, so
-- each row still reconciles against its own bank line.
create or replace function public.backfill_derived_gross_salaries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_month record;
  monthly_gross numeric;
  running numeric;
  row_gross numeric;
  -- Not named `item`: that is the table alias the grouping query uses, and a
  -- plpgsql variable of the same name shadows it.
  dispatch record;
  remaining integer;
  updated_rows integer := 0;
begin
  for employee_month in
    select
      case
        when item.seat_id is not null then 'seat:' || item.seat_id
        else 'account:' || public.digits_only(item.account_number)
      end as employee_key,
      sheet.month,
      sheet.year,
      sum(item.net_salary) as total_net,
      array_agg(item.id order by item.id) as item_ids
    from public.salary_sheet_items item
    join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
    -- Anything with a real gross on it was transcribed from a letter and is
    -- left alone; anything this function wrote before is recomputed, so a
    -- corrected slab can simply be followed by another run.
    where (item.gross_salary <= item.net_salary or item.gross_is_derived)
    group by 1, 2, 3
  loop
    monthly_gross := public.gross_up_annual_income(
      employee_month.total_net * 12,
      public.tax_year_for_month(employee_month.month, employee_month.year)
    ) / 12;

    -- Under the exemption, or a year with no slabs entered: there is no tax to
    -- reconstruct, so the row keeps the figure the letter gave it.
    if monthly_gross <= employee_month.total_net then
      continue;
    end if;

    running := 0;
    remaining := array_length(employee_month.item_ids, 1);

    for dispatch in
      select id, net_salary
      from public.salary_sheet_items
      where id = any(employee_month.item_ids)
      order by id
    loop
      remaining := remaining - 1;
      if remaining = 0 then
        -- The last dispatch absorbs the rounding, so the month's rows always
        -- add up to the month's gross exactly.
        row_gross := round(monthly_gross, 2) - running;
      else
        row_gross := round(
          monthly_gross * dispatch.net_salary / employee_month.total_net, 2
        );
        running := running + row_gross;
      end if;

      update public.salary_sheet_items
      set gross_salary = row_gross, gross_is_derived = true
      where id = dispatch.id;

      updated_rows := updated_rows + 1;
    end loop;
  end loop;

  return updated_rows;
end;
$$;

revoke all on function public.backfill_derived_gross_salaries() from public;
grant execute on function public.gross_up_annual_income(numeric, integer) to authenticated;
grant execute on function public.tax_year_for_month(integer, integer) to authenticated;

select public.backfill_derived_gross_salaries();

-- The employee's own copy of this data has to carry the flag too, or their
-- page cannot say which figures were reconstructed. The returned columns
-- change, which `create or replace` cannot do, so the old one is dropped.
drop function if exists public.get_tax_salary_slip_rows(bigint);

create function public.get_tax_salary_slip_rows(
  target_seat_id bigint
)
returns table (
  month integer,
  year integer,
  gross_salary numeric,
  net_salary numeric,
  gross_is_derived boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sheet.month,
    sheet.year,
    item.gross_salary,
    item.net_salary,
    item.gross_is_derived
  from public.salary_sheet_items item
  join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
  join public.seats seat on seat.id = target_seat_id
  where (public.is_manager() or public.is_employee_self(target_seat_id))
    and (
      item.seat_id = seat.id
      or (
        item.seat_id is null
        and (
          (
            public.digits_only(seat.account_number) <> ''
            and public.digits_only(item.account_number)
              = public.digits_only(seat.account_number)
          )
          or (
            public.digits_only(seat.cnic) <> ''
            and public.digits_only(item.cnic) = public.digits_only(seat.cnic)
          )
        )
      )
    )
  order by sheet.year, sheet.month, sheet.id;
$$;

revoke all on function public.get_tax_salary_slip_rows(bigint) from public;
grant execute on function public.get_tax_salary_slip_rows(bigint) to authenticated;
