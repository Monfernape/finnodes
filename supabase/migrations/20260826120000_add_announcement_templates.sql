-- Reusable announcement messages, mostly for the Pakistani holiday calendar.
--
-- The point of the table is that the wording is written once and reused every
-- year. Only the dates move, so the body carries tokens ({{start_date}},
-- {{end_date}}, {{return_day}}, {{return_date}}, {{start_day}}, {{year}}) that
-- the app fills in at copy time. Nothing is generated per year, and nothing is
-- stored per year either: there are no announcement "instances", just the
-- template and whatever dates the manager types when they copy it.
--
-- Seeded rows are ordinary rows. A manager can edit any of them and the edit
-- sticks, because the seed below only inserts a slug that is not there yet.

create table if not exists public.announcement_templates (
  id bigserial primary key,
  -- Stable handle for the seeded messages so re-running the seed is a no-op
  -- after someone has edited the wording.
  slug text not null unique,
  title text not null,
  emoji text not null default '',
  category text not null check (
    category in ('religious', 'national', 'company', 'event', 'custom')
  ),
  body text not null,
  -- Set for holidays that fall on the same calendar date every year, which
  -- lets the app prefill the dates. Lunar holidays leave these null because
  -- their dates are only known once the moon is sighted.
  fixed_month integer check (fixed_month between 1 and 12),
  fixed_day integer check (fixed_day between 1 and 31),
  -- How many days the break usually runs, used to prefill the end date.
  default_duration_days integer not null default 1 check (default_duration_days between 1 and 31),
  sort_order integer not null default 0,
  -- Marks the rows this migration put there, so the UI can say which messages
  -- came with the app and which a manager wrote.
  is_seeded boolean not null default false,
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A fixed date needs both halves or neither.
  check ((fixed_month is null) = (fixed_day is null))
);

create index if not exists announcement_templates_category_idx
on public.announcement_templates (category, sort_order);

create or replace function public.touch_announcement_template()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists announcement_templates_touch on public.announcement_templates;
create trigger announcement_templates_touch
before update on public.announcement_templates
for each row
execute function public.touch_announcement_template();

-- Announcements are a manager tool, so the table is closed to everyone else.
-- `is_manager()` reads the `allowed_emails` table; a manager who is only
-- listed in the ALLOWED_EMAILS env var has to be added there too, since the
-- database cannot see the env fallback.
alter table public.announcement_templates enable row level security;

drop policy if exists "Managers manage announcement templates" on public.announcement_templates;
create policy "Managers manage announcement templates"
on public.announcement_templates
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant select, insert, update, delete on public.announcement_templates to authenticated;
grant usage, select on sequence public.announcement_templates_id_seq to authenticated;

with seed (
  slug, title, emoji, category, body,
  fixed_month, fixed_day, default_duration_days, sort_order
) as (
  values
    (
      'new-year',
      'New Year Holiday',
      '🎉',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} for New Year's Day. 🎉

Thank you for everything you put into the year behind us, the launches, the late pushes, and the steady everyday work that kept things running.

Office operations will resume on {{return_day}}, {{return_date}}.

Here is to a strong and healthy {{year}}. Happy New Year! ✨

DevNodes$body$,
      1, 1, 1, 10
    ),
    (
      'kashmir-solidarity-day',
      'Kashmir Solidarity Day Holiday',
      '🤝',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} in observance of Kashmir Solidarity Day. 🤝

Please hand over anything time-sensitive to your lead before the break so nothing waits on one person.

Office operations will resume on {{return_day}}, {{return_date}}.

DevNodes$body$,
      2, 5, 1, 20
    ),
    (
      'pakistan-day',
      'Pakistan Day Holiday',
      '🇵🇰',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} to mark Pakistan Day. 🇵🇰

A good day to remember what the Lahore Resolution set in motion, and to take a proper break.

Office operations will resume on {{return_day}}, {{return_date}}.

Enjoy the day off. 🤍

DevNodes$body$,
      3, 23, 1, 30
    ),
    (
      'labour-day',
      'Labour Day Holiday',
      '🛠️',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} for Labour Day. 🛠️

The day exists because people asked for reasonable hours and got them, so please actually use it to rest rather than to catch up on work.

Office operations will resume on {{return_day}}, {{return_date}}.

DevNodes$body$,
      5, 1, 1, 40
    ),
    (
      'independence-day',
      'Independence Day Holiday',
      '🇵🇰',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} to celebrate Independence Day. 🇵🇰

Wishing you and your families a happy 14th August. Fly the flag, enjoy the day, and stay safe if you are out on the roads. 🎉

Office operations will resume on {{return_day}}, {{return_date}}.

Pakistan Zindabad! 💚

DevNodes$body$,
      8, 14, 1, 50
    ),
    (
      'iqbal-day',
      'Iqbal Day Holiday',
      '📖',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} in observance of Iqbal Day. 📖

Office operations will resume on {{return_day}}, {{return_date}}.

Enjoy the break. 🤍

DevNodes$body$,
      11, 9, 1, 60
    ),
    (
      'quaid-day-christmas',
      'Quaid-e-Azam Day & Christmas Holiday',
      '🎄',
      'national',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} for Quaid-e-Azam Day and Christmas. 🎄

Merry Christmas to everyone celebrating, and a restful day to everyone else.

Office operations will resume on {{return_day}}, {{return_date}}.

DevNodes$body$,
      12, 25, 1, 70
    ),
    (
      'ramadan-timings',
      'Ramadan Office Timings',
      '🌙',
      'religious',
      $body$Dear Team,

Ramadan Mubarak! 🌙 With the holy month beginning on {{start_date}}, DevNodes will follow revised office timings of 10:00 AM to 4:00 PM for the whole of Ramadan.

A few things to keep in mind:

* Plan sprint commitments around the shorter working day rather than stretching into the evening.
* Coordinate with your lead if a client needs overlap outside these hours.
* Keep meetings short and focused, and be considerate of colleagues who are fasting.

Wishing you all a blessed and peaceful Ramadan. 🤍

DevNodes$body$,
      null, null, 1, 110
    ),
    (
      'eid-ul-fitr',
      'Eid-ul-Fitr Holidays Announcement',
      '🌙',
      'religious',
      $body$Dear Team,

This is to inform everyone that DevNodes will observe Eid-ul-Fitr holidays from {{start_date}} to {{end_date}}. 🌙

May this Eid bring joy, peace, and countless blessings to you and your families. Take this time to rest, celebrate, and enjoy every moment with your loved ones. 🤍

Please note that office operations will resume on {{return_day}}, {{return_date}}, and all team members are expected to report back to work as scheduled. No absences will be permitted on the first working day after the Eid holidays.

Wishing you all a joyful and blessed Eid-ul-Fitr. ✨

Eid Mubarak in advance! 🎉

DevNodes$body$,
      null, null, 3, 120
    ),
    (
      'eid-ul-adha',
      'Eid-ul-Adha Holidays Announcement',
      '🐐',
      'religious',
      $body$Dear Team,

This is to inform everyone that DevNodes will observe Eid-ul-Adha holidays from {{start_date}} to {{end_date}}. 🐐

We hope this festive occasion brings happiness, peace, and blessings to you and your families. Take this opportunity to relax, celebrate, and enjoy quality time with your loved ones. 🤍

Please note that office operations will resume on {{return_day}}, {{return_date}}, and all team members are expected to report back to work as scheduled. No absences will be permitted on the first working day after the Eid holidays.

Wishing you all a joyful and blessed Eid-ul-Adha. ✨

Eid Mubarak in advance! 🌙

DevNodes$body$,
      null, null, 5, 130
    ),
    (
      'ashura',
      'Ashura Holidays (9th & 10th Muharram)',
      '🕌',
      'religious',
      $body$Dear Team,

DevNodes will remain closed from {{start_date}} to {{end_date}} to observe Ashura, the 9th and 10th of Muharram. 🕌

Please wrap up anything time-sensitive beforehand and hand ongoing work over to your lead where cover is needed.

Office operations will resume on {{return_day}}, {{return_date}}.

Wishing everyone a peaceful and safe few days. 🤍

DevNodes$body$,
      null, null, 2, 140
    ),
    (
      'eid-milad-un-nabi',
      'Eid Milad-un-Nabi Holiday',
      '🕌',
      'religious',
      $body$Dear Team,

DevNodes will remain closed on {{start_date}} to observe Eid Milad-un-Nabi. 🕌

Please plan your deliverables around the day off and let your lead know about anything that needs coverage.

Office operations will resume on {{return_day}}, {{return_date}}.

Wishing you all a blessed day. 🤍

DevNodes$body$,
      null, null, 1, 150
    ),
    (
      'performance-reviews',
      'Bi-Yearly Performance Reviews',
      '⭐',
      'company',
      $body$Hey team, we are starting bi-yearly performance reviews again. ⭐

Please take some time and write them thoughtfully. These reviews help us understand what went well, where support is needed, and how we can help each other improve. For self-review, try to be honest and specific. Mention real examples around projects, features, bugs, ownership, communication, or places where you helped someone. It is okay to talk about things that did not go well. The goal is reflection, not making everything look perfect.

For peer reviews, please be fair and helpful. Appreciate people where they did well, and share improvement areas with context. Good reviews make feedback clearer and fairer for everyone.

You should have that assigned at: finnodes.devnodes.co$body$,
      null, null, 1, 210
    ),
    (
      'team-ethics',
      'Team Ethics Announcement',
      '🤝',
      'company',
      $body$Moving forward, we expect everyone in the team to uphold a culture of mutual respect and professionalism. Please keep the following principles in mind at all times:

* *No Abusive Language*: Any form of abusive or offensive language is unacceptable.
* *No Personal Attacks*: Critique ideas, not individuals. Personal attacks will not be tolerated.
* *Respect Personal Boundaries*: Be mindful of each other's space, comfort levels, and limits.
* *Be Careful with Humor*: Jokes should never come at the cost of someone else's dignity or feelings.
* *Address Concerns Professionally*: If any management decision is unclear, reach out privately for clarification instead of raising it publicly in a way that may create unnecessary conflict among the team.

Let us create an environment where everyone feels safe, valued, and respected. Give respect to earn respect. 🤝$body$,
      null, null, 1, 220
    ),
    (
      'team-cricket-match',
      'Team Cricket Match',
      '🏏',
      'event',
      $body$Hey team, we are playing cricket on {{start_day}}, {{start_date}}. 🏏

Bring whatever you need for a couple of hours in the sun: water, a cap, and shoes you can actually run in. Bats, balls and stumps are sorted.

Everyone is welcome whether you are opening the batting or just there for the chai and the commentary. Reply here so we can sort out the teams in advance.

See you there! 🙌

DevNodes$body$,
      null, null, 1, 310
    ),
    (
      'team-dinner',
      'Team Dinner',
      '🍽️',
      'event',
      $body$Hey team, we are getting together for a team dinner on {{start_day}}, {{start_date}}. 🍽️

No laptops, no standups, no sprint talk. Just food and everyone in one place for a change.

Please confirm here so the booking count is right, and let us know if you have any dietary preferences.

See you there! 🙌

DevNodes$body$,
      null, null, 1, 320
    ),
    (
      'work-from-home-day',
      'Work From Home Day',
      '🏠',
      'event',
      $body$Dear Team,

DevNodes will be working remotely on {{start_day}}, {{start_date}}. 🏠

Please keep the usual hours, stay reachable on Slack, and join your standup on time. If your work needs anything that only exists at the office, sort it out beforehand.

Normal office operations resume on {{return_day}}, {{return_date}}.

DevNodes$body$,
      null, null, 1, 330
    )
)
insert into public.announcement_templates (
  slug, title, emoji, category, body,
  fixed_month, fixed_day, default_duration_days, sort_order, is_seeded
)
select
  seed.slug, seed.title, seed.emoji, seed.category, seed.body,
  seed.fixed_month, seed.fixed_day, seed.default_duration_days,
  seed.sort_order, true
from seed
-- Leave an edited message alone: a slug that already exists is never touched.
on conflict (slug) do nothing;
