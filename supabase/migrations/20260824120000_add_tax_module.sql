-- Income tax slabs for salaried individuals, versioned by tax year.
--
-- A Pakistani tax year runs July to June and is named after the calendar year
-- it ends in, so tax year 2026 covers 01/07/2025 - 30/06/2026. Rates are stored
-- per year rather than hardcoded because they change with every Finance Act.
--
-- Table privileges follow the project default, the same way the salary tables
-- inherited theirs.

create table if not exists public.tax_years (
  id bigserial primary key,
  tax_year integer not null unique check (tax_year between 2000 and 2100),
  starts_on date not null,
  ends_on date not null,
  -- Percentage added on top of the computed tax once taxable income passes the
  -- threshold. A null threshold means the year carries no surcharge.
  surcharge_rate numeric(5, 2) not null default 0,
  surcharge_threshold numeric(14, 2),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create table if not exists public.tax_slabs (
  id bigserial primary key,
  tax_year_id bigint not null references public.tax_years(id) on delete cascade,
  lower_limit numeric(14, 2) not null default 0,
  -- Null upper limit marks the open-ended top slab.
  upper_limit numeric(14, 2),
  fixed_amount numeric(14, 2) not null default 0,
  rate_percent numeric(5, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (upper_limit is null or upper_limit > lower_limit)
);

create index if not exists tax_slabs_tax_year_id_idx
on public.tax_slabs (tax_year_id);

create unique index if not exists tax_slabs_year_sort_key
on public.tax_slabs (tax_year_id, sort_order);

-- Tax year 2026 (01/07/2025 - 30/06/2026), Finance Act 2025. The 9% surcharge
-- above 10,000,000 applies to salaried individuals and was dropped from 2027.
insert into public.tax_years (tax_year, starts_on, ends_on, surcharge_rate, surcharge_threshold, notes)
values (2026, '2025-07-01', '2026-06-30', 9, 10000000,
        'Salaried individuals, Finance Act 2025.')
on conflict (tax_year) do nothing;

-- Tax year 2027 (01/07/2026 - 30/06/2027), Finance Act 2026: the 23% and 30%
-- brackets were cut to 20% and 25%, the top band was split at 5.6M and 7M, and
-- the salaried surcharge was abolished.
insert into public.tax_years (tax_year, starts_on, ends_on, surcharge_rate, surcharge_threshold, notes)
values (2027, '2026-07-01', '2027-06-30', 0, null,
        'Salaried individuals, Finance Act 2026. Surcharge abolished.')
on conflict (tax_year) do nothing;

with slab_input (tax_year, sort_order, lower_limit, upper_limit, fixed_amount, rate_percent) as (
  values
    -- Tax year 2026
    (2026, 0, 0, 600000, 0, 0),
    (2026, 1, 600000, 1200000, 0, 1),
    (2026, 2, 1200000, 2200000, 6000, 11),
    (2026, 3, 2200000, 3200000, 116000, 23),
    (2026, 4, 3200000, 4100000, 346000, 30),
    (2026, 5, 4100000, null, 616000, 35),
    -- Tax year 2027
    (2027, 0, 0, 600000, 0, 0),
    (2027, 1, 600000, 1200000, 0, 1),
    (2027, 2, 1200000, 2200000, 6000, 11),
    (2027, 3, 2200000, 3200000, 116000, 20),
    (2027, 4, 3200000, 4100000, 316000, 25),
    (2027, 5, 4100000, 5600000, 541000, 29),
    (2027, 6, 5600000, 7000000, 976000, 32),
    (2027, 7, 7000000, null, 1424000, 35)
)
insert into public.tax_slabs (
  tax_year_id,
  lower_limit,
  upper_limit,
  fixed_amount,
  rate_percent,
  sort_order
)
select
  tax_year.id,
  slab_input.lower_limit,
  slab_input.upper_limit,
  slab_input.fixed_amount,
  slab_input.rate_percent,
  slab_input.sort_order
from slab_input
join public.tax_years tax_year on tax_year.tax_year = slab_input.tax_year
-- Leave a year alone if someone has already entered its slabs by hand.
where not exists (
  select 1
  from public.tax_slabs existing_slab
  where existing_slab.tax_year_id = tax_year.id
);
