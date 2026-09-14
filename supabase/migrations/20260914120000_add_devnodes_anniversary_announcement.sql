-- DevNodes' own founding anniversary, alongside the individual work
-- anniversary template already seeded. Fixed to 20 September, the day the
-- company was founded in 2021, so the date prefills every year the way a
-- public holiday's does.
--
-- `{{company_years}}` is a new token (see lib/announcements.ts) rather than
-- reusing `{{years}}`: that one is counted from whichever employee the sender
-- picks, and a company-wide anniversary has no employee to pick.

insert into public.announcement_templates (
  slug, title, emoji, category, body,
  fixed_month, fixed_day, default_duration_days, sort_order,
  is_seeded, reminder_enabled
)
values (
  'devnodes-anniversary',
  'DevNodes Anniversary',
  '🎂',
  'general',
  $body$Team, today, {{start_date}}, marks {{company_years}} since DevNodes was founded on 20 September 2021. 🎂

From a small team taking on our first projects to where we are today, every person who has been part of this has added something to it. The growth we have seen is built on the work put in every day, the problems solved, and the trust earned with the people we work with.

Thank you for being part of this journey, whether you joined on day one or last month. Here is to the years still ahead. 🙌

DevNodes$body$,
  9, 20, 1, 390,
  true, false
)
on conflict (slug) do nothing;
