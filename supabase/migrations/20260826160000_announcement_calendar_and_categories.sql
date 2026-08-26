-- Two changes that go together.
--
-- 1. Announcements are now either a public holiday or a general announcement.
--    The five-way split (religious / national / company / event / custom) was a
--    distinction nobody was making in practice, and only one of the two halves
--    is driven by a calendar. New messages can only ever be general: a public
--    holiday is not something anyone invents, it comes from the calendar below.
--
-- 2. Holiday dates for 2026, 2027 and 2028 are on record, so picking a year is
--    all it takes to get the right dates out. This replaces the single
--    `upcoming_on` field added earlier: three years of real dates beats one
--    field somebody has to remember to update.
--
-- The lunar dates are astronomical estimates and are flagged `is_estimated`,
-- because Eid, Ashura and Ramadan in Pakistan are settled by moon sighting a
-- day or two ahead. The UI says so, and the row can be corrected once the
-- Ruet-e-Hilal announcement lands.

alter table public.announcement_templates
drop constraint if exists announcement_templates_category_check;

update public.announcement_templates
set category = case
  when category in ('religious', 'national') then 'public_holiday'
  else 'general'
end
where category not in ('public_holiday', 'general');

alter table public.announcement_templates
add constraint announcement_templates_category_check
check (category in ('public_holiday', 'general'));

-- Superseded by announcement_calendar_dates.
alter table public.announcement_templates
drop constraint if exists announcement_templates_upcoming_range_check;
alter table public.announcement_templates
drop column if exists upcoming_on,
drop column if exists upcoming_ends_on;

create table if not exists public.announcement_calendar_dates (
  id bigserial primary key,
  announcement_template_id bigint not null
    references public.announcement_templates(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 2000 and 2100),
  starts_on date not null,
  ends_on date not null,
  -- True for anything set by the moon rather than the calendar, so the UI can
  -- warn before the message goes out.
  is_estimated boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (announcement_template_id, calendar_year),
  check (ends_on >= starts_on),
  -- The dates have to belong to the year they are filed under, or a year
  -- picker would quietly hand back the wrong ones.
  check (extract(year from starts_on) = calendar_year)
);

create index if not exists announcement_calendar_dates_year_idx
on public.announcement_calendar_dates (calendar_year, starts_on);

drop trigger if exists announcement_calendar_dates_touch
on public.announcement_calendar_dates;
create trigger announcement_calendar_dates_touch
before update on public.announcement_calendar_dates
for each row
execute function public.touch_announcement_template();

alter table public.announcement_calendar_dates enable row level security;

drop policy if exists "Managers manage announcement calendar dates"
on public.announcement_calendar_dates;
create policy "Managers manage announcement calendar dates"
on public.announcement_calendar_dates
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

revoke all on public.announcement_calendar_dates from anon;
grant select, insert, update, delete
on public.announcement_calendar_dates to authenticated;
grant usage, select
on sequence public.announcement_calendar_dates_id_seq to authenticated;
grant all on public.announcement_calendar_dates to service_role;
grant all on sequence public.announcement_calendar_dates_id_seq to service_role;

-- Ramadan is not a holiday, but its message is driven by the same lunar
-- calendar, so it sits with the public holidays and carries dates like them.
with calendar (slug, calendar_year, starts_on, ends_on, is_estimated) as (
  values
    -- Fixed Gregorian dates. The same every year, so these are certain.
    ('new-year', 2026, date '2026-01-01', date '2026-01-01', false),
    ('new-year', 2027, date '2027-01-01', date '2027-01-01', false),
    ('new-year', 2028, date '2028-01-01', date '2028-01-01', false),
    ('kashmir-solidarity-day', 2026, date '2026-02-05', date '2026-02-05', false),
    ('kashmir-solidarity-day', 2027, date '2027-02-05', date '2027-02-05', false),
    ('kashmir-solidarity-day', 2028, date '2028-02-05', date '2028-02-05', false),
    ('pakistan-day', 2026, date '2026-03-23', date '2026-03-23', false),
    ('pakistan-day', 2027, date '2027-03-23', date '2027-03-23', false),
    ('pakistan-day', 2028, date '2028-03-23', date '2028-03-23', false),
    ('labour-day', 2026, date '2026-05-01', date '2026-05-01', false),
    ('labour-day', 2027, date '2027-05-01', date '2027-05-01', false),
    ('labour-day', 2028, date '2028-05-01', date '2028-05-01', false),
    ('independence-day', 2026, date '2026-08-14', date '2026-08-14', false),
    ('independence-day', 2027, date '2027-08-14', date '2027-08-14', false),
    ('independence-day', 2028, date '2028-08-14', date '2028-08-14', false),
    ('iqbal-day', 2026, date '2026-11-09', date '2026-11-09', false),
    ('iqbal-day', 2027, date '2027-11-09', date '2027-11-09', false),
    ('iqbal-day', 2028, date '2028-11-09', date '2028-11-09', false),
    ('quaid-day-christmas', 2026, date '2026-12-25', date '2026-12-25', false),
    ('quaid-day-christmas', 2027, date '2027-12-25', date '2027-12-25', false),
    ('quaid-day-christmas', 2028, date '2028-12-25', date '2028-12-25', false),

    -- Lunar dates, estimated. `ends_on` for Ramadan is the last fast rather
    -- than a holiday, since that message announces timings for the month.
    ('ramadan-timings', 2026, date '2026-02-19', date '2026-03-19', true),
    ('ramadan-timings', 2027, date '2027-02-08', date '2027-03-09', true),
    ('ramadan-timings', 2028, date '2028-01-28', date '2028-02-26', true),
    ('eid-ul-fitr', 2026, date '2026-03-20', date '2026-03-22', true),
    ('eid-ul-fitr', 2027, date '2027-03-10', date '2027-03-12', true),
    ('eid-ul-fitr', 2028, date '2028-02-27', date '2028-02-29', true),
    ('eid-ul-adha', 2026, date '2026-05-27', date '2026-05-29', true),
    ('eid-ul-adha', 2027, date '2027-05-17', date '2027-05-19', true),
    ('eid-ul-adha', 2028, date '2028-05-05', date '2028-05-07', true),
    ('ashura', 2026, date '2026-06-24', date '2026-06-25', true),
    ('ashura', 2027, date '2027-06-13', date '2027-06-14', true),
    ('ashura', 2028, date '2028-06-02', date '2028-06-03', true),
    ('eid-milad-un-nabi', 2026, date '2026-08-25', date '2026-08-25', true),
    ('eid-milad-un-nabi', 2027, date '2027-08-14', date '2027-08-14', true),
    ('eid-milad-un-nabi', 2028, date '2028-08-02', date '2028-08-02', true)
)
insert into public.announcement_calendar_dates (
  announcement_template_id, calendar_year, starts_on, ends_on, is_estimated
)
select
  template.id,
  calendar.calendar_year,
  calendar.starts_on,
  calendar.ends_on,
  calendar.is_estimated
from calendar
join public.announcement_templates template on template.slug = calendar.slug
-- Leave a year alone once someone has corrected it by hand.
on conflict (announcement_template_id, calendar_year) do nothing;
