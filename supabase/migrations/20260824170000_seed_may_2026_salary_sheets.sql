-- Seeds the two May 2026 dispatches, the gap left by the earlier July 2025 to
-- June 2026 seed. Both letters list the same twelve people and the same
-- amounts; P1 was issued 02/06/2026 and P2 on 22/06/2026.
--
-- Keyed by (month, year, sheet_type) like the earlier seed, so re-running adds
-- nothing twice and a sheet that already carries rows is left untouched.

with sheet_input (month, year, sheet_type, issued_on) as (
  values
    -- May P1 2026 Salaries.pdf
    ('5', '2026', 'first', '2026-06-02'),
    -- May P2 2026 Salaries.pdf
    ('5', '2026', 'second', '2026-06-22')
)
insert into public.salary_sheets (month, year, sheet_type, issued_on)
select
  sheet_input.month::integer,
  sheet_input.year::integer,
  sheet_input.sheet_type,
  sheet_input.issued_on::date
from sheet_input
on conflict (month, year, sheet_type) do nothing;

-- Same roster as the earlier seed, repeated so this migration stands alone.
-- D.O.J is read as dd/mm/yyyy, the format the rest of that column uses.
with roster (code, name, cnic, account_number, designation, date_of_joining) as (
  values
    ('nouman', 'MUHAMMAD NOUMAN PERVAIZ', '36302-1589867-7', '07361010107933', 'Software Engineer I', '2021-12-01'),
    ('ahmad', 'AHMAD ZULFIQAR', '36101-7608777-1', '07361010108012', 'Frontend Engineer I', '2021-12-07'),
    ('asad', 'Asad Ur Rehman Awan', '42401-1299005-5', '07361010108027', 'Software Engineer I', '2021-12-15'),
    ('usama', 'Muhammad Usama', '36602-0419035-9', '07361010109639', 'Frontend Engineer I', '2021-01-01'),
    ('naumani', 'Nauman Ijaz', '33202-1120583-5', '07361010109551', 'Senior Frontend Engineer', '2022-05-16'),
    ('bilal', 'MUHAMMAD BILAL', '31203-8871057-9', '07361010110075', 'Junior Frontend Engineer', '2023-04-03'),
    ('nadir', 'NADIR HUSSAIN', '32304-0903137-5', '07361010108075', 'Junior Frontend Engineer', '2023-06-05'),
    ('mubasher', 'Mubasher Shakeel', '32303-2943130-9', '07361010115382', 'Junior Frontend Engineer', '2023-06-19'),
    ('arslan', 'MUHAMMAD ARSLAN', '36302-9468207-3', '07361010236414', 'Junior Business Developer', '2024-02-09'),
    ('junaid', 'Muhammad Junaid Hassan', '36302-7589641-9', '07361010108140', 'Junior Frontend Engineer', '2024-01-10'),
    ('umar', 'MUHAMMAD UMAR SHAFIQUE', '36602-8130954-5', '07361010115181', 'Junior Frontend Engineer', '2024-01-11'),
    ('ghulam', 'GHULAM AHMAD', '3460108007471', '07361010696886', 'Junior Frontend Engineer', '2025-01-09')
),
-- Neither letter prints a gross column, so gross mirrors net.
sheet_row (month, year, sheet_type, sort_order, code, gross_salary, net_salary) as (
  values
    -- May P1 2026 Salaries.pdf
    ('5', '2026', 'first', '0', 'nouman', '80900', '80900'),
    ('5', '2026', 'first', '1', 'ahmad', '80900', '80900'),
    ('5', '2026', 'first', '2', 'asad', '91325', '91325'),
    ('5', '2026', 'first', '3', 'usama', '76450', '76450'),
    ('5', '2026', 'first', '4', 'naumani', '79738', '79738'),
    ('5', '2026', 'first', '5', 'bilal', '40840', '40840'),
    ('5', '2026', 'first', '6', 'nadir', '36400', '36400'),
    ('5', '2026', 'first', '7', 'mubasher', '38300', '38300'),
    ('5', '2026', 'first', '8', 'arslan', '24000', '24000'),
    ('5', '2026', 'first', '9', 'junaid', '24000', '24000'),
    ('5', '2026', 'first', '10', 'umar', '24000', '24000'),
    ('5', '2026', 'first', '11', 'ghulam', '20000', '20000'),
    -- May P2 2026 Salaries.pdf
    ('5', '2026', 'second', '0', 'nouman', '80900', '80900'),
    ('5', '2026', 'second', '1', 'ahmad', '80900', '80900'),
    ('5', '2026', 'second', '2', 'asad', '91325', '91325'),
    ('5', '2026', 'second', '3', 'usama', '76450', '76450'),
    ('5', '2026', 'second', '4', 'naumani', '79738', '79738'),
    ('5', '2026', 'second', '5', 'bilal', '40840', '40840'),
    ('5', '2026', 'second', '6', 'nadir', '36400', '36400'),
    ('5', '2026', 'second', '7', 'mubasher', '38300', '38300'),
    ('5', '2026', 'second', '8', 'arslan', '24000', '24000'),
    ('5', '2026', 'second', '9', 'junaid', '24000', '24000'),
    ('5', '2026', 'second', '10', 'umar', '24000', '24000'),
    ('5', '2026', 'second', '11', 'ghulam', '20000', '20000')
)
insert into public.salary_sheet_items (
  salary_sheet_id,
  seat_id,
  name,
  cnic,
  account_number,
  designation,
  date_of_joining,
  gross_salary,
  net_salary,
  sort_order
)
select
  salary_sheet.id,
  seat.id,
  roster.name,
  roster.cnic,
  roster.account_number,
  roster.designation,
  roster.date_of_joining::date,
  sheet_row.gross_salary::numeric,
  sheet_row.net_salary::numeric,
  sheet_row.sort_order::integer
from sheet_row
join roster on roster.code = sheet_row.code
join public.salary_sheets salary_sheet
  on salary_sheet.month = sheet_row.month::integer
  and salary_sheet.year = sheet_row.year::integer
  and salary_sheet.sheet_type = sheet_row.sheet_type
-- Link back to the seat when one exists, comparing digits only so a stored
-- account number that carries spaces or dashes still matches.
left join lateral (
  select seats.id
  from public.seats
  where regexp_replace(coalesce(seats.account_number, ''), '\D', '', 'g')
    = roster.account_number
  order by seats.id
  limit 1
) seat on true
where not exists (
  select 1
  from public.salary_sheet_items existing_item
  where existing_item.salary_sheet_id = salary_sheet.id
);
