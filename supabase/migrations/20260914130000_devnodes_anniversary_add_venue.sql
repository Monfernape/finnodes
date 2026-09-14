-- The DevNodes Anniversary template was seeded once already with its first
-- wording (a fixed-date fact statement, no venue). Editing the seed migration
-- itself does not reach a row that migration already inserted — `on conflict
-- (slug) do nothing` skips it on every re-run — so the row is updated here
-- instead, the same guarded way `team-dinner` picked up its own venue token.
--
-- Guarded on `is_seeded` and on the venue token being absent, so this is a
-- no-op both for a manager who has since edited the wording by hand and for
-- an environment where the seed migration already carried this body.

update public.announcement_templates
set
  body = $body$Team, DevNodes turns {{company_years}} old this year! 🎂

Join us on {{start_day}}, {{start_date}} at {{venue}} as we mark the occasion together — good food, good company, and a moment to look back on everything built since we started this on 20 September 2021.

Everyone is invited. Come celebrate with us! 🙌

DevNodes$body$,
  fixed_month = null,
  fixed_day = null
where slug = 'devnodes-anniversary'
  and is_seeded
  and body not like '%{{venue}}%';
