-- Two employees' names drifted from their canonical spelling. The per-row
-- "Name" field on the salary sheet editor is free text, decoupled from the
-- seat it is linked to, so a hand-typed correction on one sheet stuck:
--   "Mubasher Shakeel" -> "Muhammad Mubashir"
--   "NADIR HUSSAIN"    -> "Nadir Hussain" (case drifted)
-- and every sheet duplicated from that one carried the wrong spelling
-- forward (DuplicateSheetDialog used to copy a row's stored name verbatim
-- rather than re-reading it from the seat).
--
-- Restored everywhere a name was snapshotted from the seat, matched by CNIC
-- (digits only, so formatting differences don't matter) rather than by
-- whatever the name currently reads — the name is exactly what is
-- unreliable here. `seats.name` itself is corrected too, in case the drift
-- started there rather than on a sheet.

with canonical (cnic, name) as (
  values
    ('32304-0903137-5', 'NADIR HUSSAIN'),
    ('32303-2943130-9', 'Mubasher Shakeel')
)
update public.seats s
set name = c.name
from canonical c
where public.digits_only(s.cnic) = public.digits_only(c.cnic)
  and s.name <> c.name;

-- salary_sheet_items.seat_id is not always set (older rows were typed by
-- hand), so a row is also matched by its own CNIC or account number when it
-- carries no link — the same fallback the tax and payslip code already uses.
with canonical (cnic, account_number, name) as (
  values
    ('32304-0903137-5', '07361010108075', 'NADIR HUSSAIN'),
    ('32303-2943130-9', '07361010115382', 'Mubasher Shakeel')
)
update public.salary_sheet_items i
set name = c.name
from canonical c
left join public.seats s on public.digits_only(s.cnic) = public.digits_only(c.cnic)
where i.name <> c.name
  and (
    i.seat_id = s.id
    or (
      i.seat_id is null
      and (
        public.digits_only(i.cnic) = public.digits_only(c.cnic)
        or public.digits_only(i.account_number) = public.digits_only(c.account_number)
      )
    )
  );

with canonical (cnic, name) as (
  values
    ('32304-0903137-5', 'NADIR HUSSAIN'),
    ('32303-2943130-9', 'Mubasher Shakeel')
)
update public.salary_slips sl
set employee_name = c.name
from canonical c
join public.seats s on public.digits_only(s.cnic) = public.digits_only(c.cnic)
where sl.seat_id = s.id
  and sl.employee_name <> c.name;

with canonical (cnic, name) as (
  values
    ('32304-0903137-5', 'NADIR HUSSAIN'),
    ('32303-2943130-9', 'Mubasher Shakeel')
)
update public.experience_letters el
set employee_name = c.name
from canonical c
join public.seats s on public.digits_only(s.cnic) = public.digits_only(c.cnic)
where el.seat_id = s.id
  and el.employee_name <> c.name;

with canonical (cnic, name) as (
  values
    ('32304-0903137-5', 'NADIR HUSSAIN'),
    ('32303-2943130-9', 'Mubasher Shakeel')
)
update public.salary_disbursement_letters dl
set employee_name = c.name
from canonical c
join public.seats s on public.digits_only(s.cnic) = public.digits_only(c.cnic)
where dl.seat_id = s.id
  and dl.employee_name <> c.name;
