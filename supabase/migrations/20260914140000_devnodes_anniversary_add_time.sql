-- Adds a time span to the DevNodes Anniversary invitation, and a `{{time}}`
-- token to go with it (see lib/announcements.ts) — free text like the venue,
-- since a time span has no list worth keeping.
--
-- Written to set the whole final body rather than patch a fragment, and
-- guarded only on the time token being absent, so this catches the row up
-- regardless of which earlier version of the wording it currently holds (the
-- original fixed-date text, or the venue-only revision) without needing to
-- know which. Still a no-op for a manager who has since edited it by hand.

update public.announcement_templates
set body = $body$Team, DevNodes turns {{company_years}} old this year! 🎂

Join us on {{start_day}}, {{start_date}} from {{time}} at {{venue}} as we mark the occasion together — good food, good company, and a moment to look back on everything built since we started this on 20 September 2021.

Everyone is invited. Come celebrate with us! 🙌

DevNodes$body$
where slug = 'devnodes-anniversary'
  and is_seeded
  and body not like '%{{time}}%';
