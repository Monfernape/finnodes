-- Seeds the salary sheets that were issued to Bank Alfalah Multan between
-- July 2025 and June 2026, transcribed from the signed letters. Files named
-- "<Month> P1" are the first dispatch and "P2" the second, so they land as
-- separate sheets for the same month. May 2026 has no letter and is not seeded.
--
-- One row is intentionally not carried over: the founder row that page 2 of the
-- March P1 letter lists as Sr 13, so that sheet holds 12 rows here and 13 there.
--
-- Sheets are keyed by (month, year, sheet_type), so re-running this migration
-- adds nothing twice, and a sheet that already carries rows is left untouched.

with sheet_input (month, year, sheet_type, issued_on) as (
  values
    -- July 2025 Salaries.pdf
    ('7', '2025', 'full', '2025-08-19'),
    -- August 2025 Salaries.pdf
    ('8', '2025', 'full', '2025-09-17'),
    -- September 2025 Salaries.pdf
    ('9', '2025', 'full', '2025-11-19'),
    -- Oct 2025 Salaries.pdf
    ('10', '2025', 'full', '2025-11-19'),
    -- November 2025 Salaries.pdf
    ('11', '2025', 'full', '2025-12-17'),
    -- December 2025 Salaries.pdf
    ('12', '2025', 'full', '2026-01-20'),
    -- January 2026 Salaries.pdf
    ('1', '2026', 'full', '2026-01-20'),
    -- February 2026 Salaries.pdf
    ('2', '2026', 'full', '2026-03-19'),
    -- March P1 2026 Salaries.pdf
    ('3', '2026', 'first', '2026-05-07'),
    -- March P2 2026 Salaries.pdf
    ('3', '2026', 'second', '2026-04-17'),
    -- April P1 2026 Salaries.pdf
    ('4', '2026', 'first', '2026-05-08'),
    -- April P2 2026 Salaries.pdf
    ('4', '2026', 'second', '2026-05-19'),
    -- June P1 2026 Salaries (4).pdf
    ('6', '2026', 'first', '2026-08-05'),
    -- June P2 2026 Salaries (1).pdf
    ('6', '2026', 'second', '2026-06-18')
)
insert into public.salary_sheets (month, year, sheet_type, issued_on)
select
  sheet_input.month::integer,
  sheet_input.year::integer,
  sheet_input.sheet_type,
  sheet_input.issued_on::date
from sheet_input
on conflict (month, year, sheet_type) do nothing;

-- Employee details are identical across every letter, so they are listed once
-- here. D.O.J is read as dd/mm/yyyy, the format the rest of that column uses.
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
-- Only the July 2025 letter prints a gross column; every later letter prints
-- net alone, so gross mirrors net on those sheets.
sheet_row (month, year, sheet_type, sort_order, code, gross_salary, net_salary) as (
  values
    -- July 2025 Salaries.pdf
    ('7', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('7', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('7', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('7', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('7', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('7', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('7', '2025', 'full', '6', 'nadir', '48000', '48000'),
    ('7', '2025', 'full', '7', 'mubasher', '48000', '48000'),
    ('7', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('7', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('7', '2025', 'full', '10', 'umar', '20000', '20000'),
    -- August 2025 Salaries.pdf
    ('8', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('8', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('8', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('8', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('8', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('8', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('8', '2025', 'full', '6', 'nadir', '68800', '68800'),
    ('8', '2025', 'full', '7', 'mubasher', '59994', '59994'),
    ('8', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('8', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('8', '2025', 'full', '10', 'umar', '33000', '33000'),
    -- September 2025 Salaries.pdf
    ('9', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('9', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('9', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('9', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('9', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('9', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('9', '2025', 'full', '6', 'nadir', '72800', '72800'),
    ('9', '2025', 'full', '7', 'mubasher', '76600', '76600'),
    ('9', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('9', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('9', '2025', 'full', '10', 'umar', '33000', '33000'),
    -- Oct 2025 Salaries.pdf
    ('10', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('10', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('10', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('10', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('10', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('10', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('10', '2025', 'full', '6', 'nadir', '72800', '72800'),
    ('10', '2025', 'full', '7', 'mubasher', '76600', '76600'),
    ('10', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('10', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('10', '2025', 'full', '10', 'umar', '33000', '33000'),
    -- November 2025 Salaries.pdf
    ('11', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('11', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('11', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('11', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('11', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('11', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('11', '2025', 'full', '6', 'nadir', '72800', '72800'),
    ('11', '2025', 'full', '7', 'mubasher', '76600', '76600'),
    ('11', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('11', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('11', '2025', 'full', '10', 'umar', '33000', '33000'),
    -- December 2025 Salaries.pdf
    ('12', '2025', 'full', '0', 'nouman', '126200', '126200'),
    ('12', '2025', 'full', '1', 'ahmad', '126200', '126200'),
    ('12', '2025', 'full', '2', 'asad', '139550', '139550'),
    ('12', '2025', 'full', '3', 'usama', '117300', '117300'),
    ('12', '2025', 'full', '4', 'naumani', '144000', '144000'),
    ('12', '2025', 'full', '5', 'bilal', '81680', '81680'),
    ('12', '2025', 'full', '6', 'nadir', '72800', '72800'),
    ('12', '2025', 'full', '7', 'mubasher', '76600', '76600'),
    ('12', '2025', 'full', '8', 'arslan', '33000', '33000'),
    ('12', '2025', 'full', '9', 'junaid', '33000', '33000'),
    ('12', '2025', 'full', '10', 'umar', '33000', '33000'),
    ('12', '2025', 'full', '11', 'ghulam', '20000', '20000'),
    -- January 2026 Salaries.pdf
    ('1', '2026', 'full', '0', 'nouman', '126200', '126200'),
    ('1', '2026', 'full', '1', 'ahmad', '126200', '126200'),
    ('1', '2026', 'full', '2', 'asad', '139550', '139550'),
    ('1', '2026', 'full', '3', 'usama', '117300', '117300'),
    ('1', '2026', 'full', '4', 'naumani', '144000', '144000'),
    ('1', '2026', 'full', '5', 'bilal', '81680', '81680'),
    ('1', '2026', 'full', '6', 'nadir', '72800', '72800'),
    ('1', '2026', 'full', '7', 'mubasher', '76600', '76600'),
    ('1', '2026', 'full', '8', 'arslan', '33000', '33000'),
    ('1', '2026', 'full', '9', 'junaid', '33000', '33000'),
    ('1', '2026', 'full', '10', 'umar', '33000', '33000'),
    ('1', '2026', 'full', '11', 'ghulam', '20000', '20000'),
    -- February 2026 Salaries.pdf
    ('2', '2026', 'full', '0', 'nouman', '126200', '126200'),
    ('2', '2026', 'full', '1', 'ahmad', '126200', '126200'),
    ('2', '2026', 'full', '2', 'asad', '139550', '139550'),
    ('2', '2026', 'full', '3', 'usama', '117300', '117300'),
    ('2', '2026', 'full', '4', 'naumani', '144000', '144000'),
    ('2', '2026', 'full', '5', 'bilal', '81680', '81680'),
    ('2', '2026', 'full', '6', 'nadir', '72800', '72800'),
    ('2', '2026', 'full', '7', 'mubasher', '76600', '76600'),
    ('2', '2026', 'full', '8', 'arslan', '48000', '48000'),
    ('2', '2026', 'full', '9', 'junaid', '48000', '48000'),
    ('2', '2026', 'full', '10', 'umar', '48000', '48000'),
    ('2', '2026', 'full', '11', 'ghulam', '20000', '20000'),
    -- March P1 2026 Salaries.pdf
    ('3', '2026', 'first', '0', 'nouman', '80900', '80900'),
    ('3', '2026', 'first', '1', 'ahmad', '63100', '63100'),
    ('3', '2026', 'first', '2', 'asad', '80550', '80550'),
    ('3', '2026', 'first', '3', 'usama', '58650', '58650'),
    ('3', '2026', 'first', '4', 'naumani', '72000', '72000'),
    ('3', '2026', 'first', '5', 'bilal', '40840', '40840'),
    ('3', '2026', 'first', '6', 'nadir', '36400', '36400'),
    ('3', '2026', 'first', '7', 'mubasher', '38300', '38300'),
    ('3', '2026', 'first', '8', 'arslan', '24000', '24000'),
    ('3', '2026', 'first', '9', 'junaid', '24000', '24000'),
    ('3', '2026', 'first', '10', 'umar', '24000', '24000'),
    ('3', '2026', 'first', '11', 'ghulam', '10000', '10000'),
    -- March P2 2026 Salaries.pdf
    ('3', '2026', 'second', '0', 'nouman', '80900', '80900'),
    ('3', '2026', 'second', '1', 'ahmad', '63100', '63100'),
    ('3', '2026', 'second', '2', 'asad', '80550', '80550'),
    ('3', '2026', 'second', '3', 'usama', '58650', '58650'),
    ('3', '2026', 'second', '4', 'naumani', '72000', '72000'),
    ('3', '2026', 'second', '5', 'bilal', '40840', '40840'),
    ('3', '2026', 'second', '6', 'nadir', '36400', '36400'),
    ('3', '2026', 'second', '7', 'mubasher', '38300', '38300'),
    ('3', '2026', 'second', '8', 'arslan', '24000', '24000'),
    ('3', '2026', 'second', '9', 'junaid', '24000', '24000'),
    ('3', '2026', 'second', '10', 'umar', '24000', '24000'),
    ('3', '2026', 'second', '11', 'ghulam', '10000', '10000'),
    -- April P1 2026 Salaries.pdf
    ('4', '2026', 'first', '0', 'nouman', '161800', '161800'),
    ('4', '2026', 'first', '1', 'ahmad', '76450', '76450'),
    ('4', '2026', 'first', '2', 'asad', '182650', '182650'),
    ('4', '2026', 'first', '3', 'usama', '58650', '58650'),
    ('4', '2026', 'first', '4', 'naumani', '144000', '144000'),
    ('4', '2026', 'first', '5', 'bilal', '40840', '40840'),
    ('4', '2026', 'first', '6', 'nadir', '36400', '36400'),
    ('4', '2026', 'first', '7', 'mubasher', '38300', '38300'),
    ('4', '2026', 'first', '8', 'arslan', '24000', '24000'),
    ('4', '2026', 'first', '9', 'junaid', '24000', '24000'),
    ('4', '2026', 'first', '10', 'umar', '24000', '24000'),
    ('4', '2026', 'first', '11', 'ghulam', '10000', '10000'),
    -- April P2 2026 Salaries.pdf
    ('4', '2026', 'second', '0', 'ahmad', '76450', '76450'),
    ('4', '2026', 'second', '1', 'usama', '58650', '58650'),
    ('4', '2026', 'second', '2', 'bilal', '40840', '40840'),
    ('4', '2026', 'second', '3', 'nadir', '36400', '36400'),
    ('4', '2026', 'second', '4', 'mubasher', '38300', '38300'),
    ('4', '2026', 'second', '5', 'arslan', '24000', '24000'),
    ('4', '2026', 'second', '6', 'junaid', '24000', '24000'),
    ('4', '2026', 'second', '7', 'umar', '24000', '24000'),
    ('4', '2026', 'second', '8', 'ghulam', '10000', '10000'),
    -- June P1 2026 Salaries (4).pdf
    ('6', '2026', 'first', '0', 'nouman', '80900', '80900'),
    ('6', '2026', 'first', '1', 'ahmad', '80900', '80900'),
    ('6', '2026', 'first', '2', 'asad', '91325', '91325'),
    ('6', '2026', 'first', '3', 'usama', '76450', '76450'),
    ('6', '2026', 'first', '4', 'naumani', '87475', '87475'),
    ('6', '2026', 'first', '5', 'bilal', '51975', '51975'),
    ('6', '2026', 'first', '6', 'nadir', '36400', '36400'),
    ('6', '2026', 'first', '7', 'mubasher', '38300', '38300'),
    ('6', '2026', 'first', '8', 'arslan', '24000', '24000'),
    ('6', '2026', 'first', '9', 'junaid', '24000', '24000'),
    ('6', '2026', 'first', '10', 'umar', '24000', '24000'),
    ('6', '2026', 'first', '11', 'ghulam', '20000', '20000'),
    -- June P2 2026 Salaries (1).pdf
    ('6', '2026', 'second', '0', 'nouman', '80900', '80900'),
    ('6', '2026', 'second', '1', 'ahmad', '80900', '80900'),
    ('6', '2026', 'second', '2', 'asad', '91325', '91325'),
    ('6', '2026', 'second', '3', 'usama', '76450', '76450'),
    ('6', '2026', 'second', '4', 'naumani', '87475', '87475'),
    ('6', '2026', 'second', '5', 'bilal', '51233', '51233'),
    ('6', '2026', 'second', '6', 'nadir', '36400', '36400'),
    ('6', '2026', 'second', '7', 'mubasher', '38300', '38300'),
    ('6', '2026', 'second', '8', 'arslan', '24000', '24000'),
    ('6', '2026', 'second', '9', 'junaid', '24000', '24000'),
    ('6', '2026', 'second', '10', 'umar', '24000', '24000'),
    ('6', '2026', 'second', '11', 'ghulam', '20000', '20000')
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

