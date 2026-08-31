-- An employee can now generate their own tax salary slip, and only their own.
--
-- The document is built from the salary sheets the company dispatched, which
-- live in `salary_sheets` and `salary_sheet_items` — tables that hold every
-- employee's pay. Handing an employee's page a query against those would mean
-- trusting the app to filter them, so this returns the one person's pay and
-- refuses anything else, the same way `get_salary_disbursements` does for the
-- disbursement letter.
--
-- One row per dispatch rather than a monthly total: a month paid in two goes
-- has to stay recognisable as two payments, and the summing belongs where the
-- rest of the document is built.

-- Digits only, so an account number written "0736-1010107933" on a sheet still
-- matches "07361010107933" on the employee record.
create or replace function public.digits_only(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

create or replace function public.get_tax_salary_slip_rows(
  target_seat_id bigint
)
returns table (
  month integer,
  year integer,
  gross_salary numeric,
  net_salary numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select sheet.month, sheet.year, item.gross_salary, item.net_salary
  from public.salary_sheet_items item
  join public.salary_sheets sheet on sheet.id = item.salary_sheet_id
  join public.seats seat on seat.id = target_seat_id
  where (public.is_manager() or public.is_employee_self(target_seat_id))
    and (
      item.seat_id = seat.id
      -- Rows typed before sheets linked to seats carry no link, so they are
      -- matched back to the person the way the manager's page matches them.
      -- Without this an employee's own year would be missing months a manager
      -- can see, on a document filed with a tax return.
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

-- Callable by anyone signed in; the function itself decides whose pay, if
-- anyone's, the caller is entitled to. Postgres grants EXECUTE to PUBLIC on
-- every new function, so anon is taken off explicitly first.
revoke all on function public.get_tax_salary_slip_rows(bigint) from public;
grant execute on function public.get_tax_salary_slip_rows(bigint) to authenticated;

grant execute on function public.digits_only(text) to authenticated;
