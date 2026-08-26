-- Three things.
--
-- 1. A venue list, so a dinner announcement names a restaurant picked from a
--    list rather than typed out each time. Seeded with well-known Pakistani
--    names; anything freshly opened gets added from the picker.
--
-- 2. Six more general announcements, the ones where the date is always chosen
--    by hand: cricket and dinner, dinner on its own, badminton and an office
--    BBQ, a work anniversary, and employee of the quarter and of the year.
--
-- 3. Reminders are now structurally limited to public holidays. General
--    announcements go out when management decides to send them, so there is
--    nothing for a cron to count back from, and a check constraint says so
--    rather than leaving it to a default that could drift.

-- Venues -------------------------------------------------------------------

create table if not exists public.announcement_venues (
  id bigserial primary key,
  name text not null unique,
  -- Free text rather than a fixed list: a chain has branches everywhere and a
  -- one-off has a single address.
  city text,
  cuisine text,
  -- Somewhere that has closed down stays on the record so an old announcement
  -- still reads correctly, but drops out of the picker.
  is_active boolean not null default true,
  notes text,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcement_venues_active_idx
on public.announcement_venues (is_active, name);

drop trigger if exists announcement_venues_touch on public.announcement_venues;
create trigger announcement_venues_touch
before update on public.announcement_venues
for each row
execute function public.touch_announcement_template();

alter table public.announcement_venues enable row level security;

drop policy if exists "Managers manage venues" on public.announcement_venues;
create policy "Managers manage venues"
on public.announcement_venues
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

revoke all on public.announcement_venues from anon;
grant select, insert, update, delete on public.announcement_venues to authenticated;
grant usage, select on sequence public.announcement_venues_id_seq to authenticated;

-- City is deliberately left null: these are chains or names known across
-- Lahore, Karachi and Islamabad, and the city of a specific branch is for
-- whoever books it to fill in.
insert into public.announcement_venues (name, cuisine)
values
  ('BBQ Tonight', 'BBQ'),
  ('Bundu Khan', 'Pakistani BBQ'),
  ('Kababjees', 'BBQ'),
  ('Butt Karahi', 'Karahi'),
  ('Salt''n Pepper', 'Pakistani'),
  ('Village Restaurant', 'Buffet'),
  ('Spice Bazaar', 'Buffet'),
  ('Cafe Aylanto', 'Continental'),
  ('Arizona Grill', 'Steakhouse'),
  ('Tuscany Courtyard', 'Italian'),
  ('Broadway Pizza', 'Pizza'),
  ('Original Pizza Time Pakistan', 'Pizza'),
  ('Nando''s', 'Flame-grilled chicken'),
  ('Howdy', 'American'),
  ('Yum Chinese & Thai', 'Asian'),
  ('Ginsoy', 'Chinese'),
  ('English Tea House', 'Continental'),
  ('Chaaye Khana', 'Cafe')
on conflict (name) do nothing;

-- Reminders are for public holidays only ------------------------------------

update public.announcement_templates
set reminder_enabled = false
where category = 'general';

alter table public.announcement_templates
drop constraint if exists announcement_templates_reminder_scope_check;
alter table public.announcement_templates
add constraint announcement_templates_reminder_scope_check
check (category = 'public_holiday' or not reminder_enabled);

-- Six more general announcements --------------------------------------------

-- The existing dinner message predates the venue list, so it gains the token.
-- Guarded on the token being absent, which makes this a no-op on a re-run and
-- on a copy someone has already added a venue to.
update public.announcement_templates
set body = $body$Hey team, we are getting together for a team dinner on {{start_day}}, {{start_date}} at {{venue}}. 🍽️

No laptops, no standups, no sprint talk. Just food and everyone in one place for a change.

Please confirm here so the booking count is right, and let us know if you have any dietary preferences.

See you there! 🙌

DevNodes$body$
where slug = 'team-dinner'
  and is_seeded
  and body not like '%{{venue}}%';

with seed (
  slug, title, emoji, body, default_duration_days, sort_order
) as (
  values
    (
      'cricket-and-dinner',
      'Cricket Match & Team Dinner',
      '🏏',
      $body$Hey team, we are doing a double bill on {{start_day}}, {{start_date}}. 🏏

We start with cricket in the afternoon, then head straight to {{venue}} for dinner. 🍽️

Bring water, a cap and shoes you can actually run in. Bats, balls and stumps are sorted. If cricket is not your thing, come for the dinner anyway, nobody is checking your batting average.

Reply here so we can sort out the teams and get the booking count right.

See you there! 🙌

DevNodes$body$,
      1, 340
    ),
    (
      'badminton-and-bbq',
      'Badminton Tournament & Office BBQ',
      '🏸',
      $body$Hey team, we are running a badminton tournament on {{start_day}}, {{start_date}}, with a BBQ at the office straight after. 🏸

How it works:

* Sign up here, singles or doubles, and we will draw the bracket a day before.
* Rackets and shuttles are provided, but bring your own racket if you have a favourite.
* The BBQ fires up once the final is done, so stay even if you get knocked out early. 🍖

Come for the tournament, come for the food, or come to heckle from the sidelines. All three are valid.

Reply here to enter. 🙌

DevNodes$body$,
      1, 350
    ),
    (
      'work-anniversary',
      'Work Anniversary',
      '🎉',
      $body$Team, today marks {{years}} of {{employee}} at DevNodes. 🎉

{{employee}} joined us as {{designation}} and has been part of the work, the late pushes and the wins ever since. Milestones like this are worth stopping for, because they say something about both the person and the team around them.

Thank you for everything you have put in, and here is to what comes next. 🙌

Please join us in congratulating {{employee}}!

DevNodes$body$,
      1, 360
    ),
    (
      'employee-of-the-quarter',
      'Employee of the Quarter',
      '🏆',
      $body$Team, our Employee of the Quarter for {{quarter}} is {{employee}}. 🏆

{{employee}}, our {{designation}}, stood out this quarter for consistent ownership, the quality of the work shipped, and being the person others could rely on when it mattered.

This is decided on what the whole quarter looked like, not one good week, so it is genuinely earned.

Congratulations {{employee}}, and thank you. 🙌

Please join us in celebrating this one.

DevNodes$body$,
      1, 370
    ),
    (
      'employee-of-the-year',
      'Employee of the Year',
      '🌟',
      $body$Team, our Employee of the Year for {{year}} is {{employee}}. 🌟

Across the whole year, {{employee}}, our {{designation}}, has set the standard for what we want DevNodes to be: dependable under pressure, generous with help, and consistently raising the quality of what we ship.

This is the hardest one to win, because it asks for a full year of it rather than a strong stretch.

Congratulations {{employee}}. Thoroughly deserved. 🙌

Please join us in celebrating.

DevNodes$body$,
      1, 380
    )
)
insert into public.announcement_templates (
  slug, title, emoji, category, body,
  fixed_month, fixed_day, default_duration_days, sort_order,
  is_seeded, reminder_enabled
)
select
  seed.slug, seed.title, seed.emoji, 'general', seed.body,
  null, null, seed.default_duration_days, seed.sort_order,
  true, false
from seed
on conflict (slug) do nothing;

-- One-on-one agenda reminders ----------------------------------------------

-- Nudges every employee to put their own points into that month's 1:1 before
-- it happens, so the conversation starts from something they raised.
--
-- `unique (seat_id, year, month)` is what keeps it to one email each per
-- month, and makes next month a fresh row with nothing to reset.
create table if not exists public.one_on_one_reminder_outbox (
  id bigserial primary key,
  seat_id bigint not null references public.seats(id) on delete cascade,
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seat_id, year, month)
);

create index if not exists one_on_one_reminder_outbox_period_idx
on public.one_on_one_reminder_outbox (year desc, month desc);

drop trigger if exists one_on_one_reminder_outbox_touch
on public.one_on_one_reminder_outbox;
create trigger one_on_one_reminder_outbox_touch
before update on public.one_on_one_reminder_outbox
for each row
execute function public.touch_announcement_template();

alter table public.one_on_one_reminder_outbox enable row level security;

-- Managers can look at the delivery history. Employees have no reason to read
-- the ledger, and the cron that writes it runs as `service_role`.
drop policy if exists "Managers read one on one reminders"
on public.one_on_one_reminder_outbox;
create policy "Managers read one on one reminders"
on public.one_on_one_reminder_outbox
for select
to authenticated
using (public.is_manager());

revoke all on public.one_on_one_reminder_outbox from anon;
grant select on public.one_on_one_reminder_outbox to authenticated;
grant all on public.one_on_one_reminder_outbox to service_role;
revoke all on sequence public.one_on_one_reminder_outbox_id_seq from anon;
grant all on sequence public.one_on_one_reminder_outbox_id_seq to service_role;
