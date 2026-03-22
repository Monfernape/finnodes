alter table public.seats
add column if not exists status text not null default 'active' check (status in ('active', 'inactive')),
add column if not exists bank_linked boolean not null default false,
add column if not exists cnic text,
add column if not exists account_number text,
add column if not exists designation text,
add column if not exists date_of_joining date,
add column if not exists gross_salary numeric(12, 2) not null default 0,
add column if not exists net_salary numeric(12, 2) not null default 0;

create table if not exists public.salary_sheets (
  id bigserial primary key,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  issued_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (month, year)
);

create table if not exists public.salary_sheet_items (
  id bigserial primary key,
  salary_sheet_id bigint not null references public.salary_sheets(id) on delete cascade,
  seat_id bigint references public.seats(id) on delete set null,
  name text not null,
  cnic text not null,
  account_number text not null,
  designation text not null,
  date_of_joining date not null,
  gross_salary numeric(12, 2) not null default 0,
  net_salary numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists salary_sheet_items_unique_seat_per_sheet
on public.salary_sheet_items (salary_sheet_id, seat_id)
where seat_id is not null;
