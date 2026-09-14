-- DevNodes' own founding anniversary, alongside the individual work
-- anniversary template already seeded. Not fixed to 20 September the way a
-- public holiday is: the actual founding day only decides how many years are
-- being celebrated, not when the party happens, so the date and venue are
-- picked by whoever sends it, the same as the other celebration templates
-- (team dinner, cricket, badminton) already seeded.
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
  $body$Team, DevNodes turns {{company_years}} old this year! 🎂

Join us on {{start_day}}, {{start_date}} at {{venue}} as we mark the occasion together — good food, good company, and a moment to look back on everything built since we started this on 20 September 2021.

Everyone is invited. Come celebrate with us! 🙌

DevNodes$body$,
  null, null, 1, 390,
  true, false
)
on conflict (slug) do nothing;
