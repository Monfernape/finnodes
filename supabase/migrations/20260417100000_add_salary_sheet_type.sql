alter table public.salary_sheets
add column if not exists sheet_type text not null default 'full'
check (sheet_type in ('full', 'first', 'second'));

alter table public.salary_sheets
drop constraint if exists salary_sheets_month_year_key;

create unique index if not exists salary_sheets_month_year_sheet_type_key
on public.salary_sheets (month, year, sheet_type);
