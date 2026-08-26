-- One email to the managers, a week before an announcement is due, telling
-- them to post it in the DevNodes Family WhatsApp group.
--
-- The reminder needs a date to count back from, and until now only the fixed
-- national holidays had one: Eid, Ashura and Ramadan are lunar, and an outing
-- is whenever it is booked for. So a template can now carry the date of its
-- next occurrence, set once by whoever knows it. Fixed holidays still need
-- nothing typed at all — their date is worked out from `fixed_month` and
-- `fixed_day`, and `upcoming_on` only overrides that when it is set.
--
-- Recording next year's Eid dates is not the same as rewriting the message.
-- The wording still lives untouched in `body`; this is two date fields.

alter table public.announcement_templates
add column if not exists upcoming_on date,
add column if not exists upcoming_ends_on date,
-- Lets a manager mute a template that should never chase anyone, without
-- having to clear its dates.
add column if not exists reminder_enabled boolean not null default true;

alter table public.announcement_templates
drop constraint if exists announcement_templates_upcoming_range_check;
alter table public.announcement_templates
add constraint announcement_templates_upcoming_range_check
check (
  upcoming_ends_on is null
  or upcoming_on is null
  or upcoming_ends_on >= upcoming_on
);

-- The reminder ledger, following the same shape as the review notification
-- outbox so both notifications are diagnosed the same way.
--
-- `unique (announcement_template_id, occurs_on)` is what makes "notify once"
-- true, and it re-arms on its own: next year's Eid is a different `occurs_on`,
-- so it reminds again without anything being reset by hand.
create table if not exists public.announcement_reminder_outbox (
  id bigserial primary key,
  announcement_template_id bigint not null
    references public.announcement_templates(id) on delete cascade,
  -- The occurrence being reminded about, not the day the email went out.
  occurs_on date not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  -- How many managers the email went to, so a silent empty allowlist is
  -- visible rather than looking like a successful send.
  recipient_count integer not null default 0 check (recipient_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (announcement_template_id, occurs_on)
);

create index if not exists announcement_reminder_outbox_template_idx
on public.announcement_reminder_outbox (announcement_template_id, occurs_on desc);

drop trigger if exists announcement_reminder_outbox_touch
on public.announcement_reminder_outbox;
create trigger announcement_reminder_outbox_touch
before update on public.announcement_reminder_outbox
for each row
execute function public.touch_announcement_template();

alter table public.announcement_reminder_outbox enable row level security;

-- Managers read their own reminder history in the app. The cron that sends the
-- email runs as `service_role`, which bypasses these rules, so nothing here
-- needs to grant a write to a signed-in user.
drop policy if exists "Managers read announcement reminders"
on public.announcement_reminder_outbox;
create policy "Managers read announcement reminders"
on public.announcement_reminder_outbox
for select
to authenticated
using (public.is_manager());

revoke all on public.announcement_reminder_outbox from anon;
grant select on public.announcement_reminder_outbox to authenticated;
grant all on public.announcement_reminder_outbox to service_role;

revoke all on sequence public.announcement_reminder_outbox_id_seq from anon;
grant all on sequence public.announcement_reminder_outbox_id_seq to service_role;

-- The reminder only fires for announcements that land on a date, so the two
-- standing messages are muted rather than left looking like they are waiting
-- on a date that will never come.
update public.announcement_templates
set reminder_enabled = false
where slug in ('performance-reviews', 'team-ethics')
  and is_seeded;
