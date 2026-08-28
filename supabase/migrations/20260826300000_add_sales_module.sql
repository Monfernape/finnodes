-- Cold-call leads, the strategies used to work them, and a log of what was
-- said.
--
-- Everything here is typed by hand. There is no import, no lead scoring, no
-- pipeline automation: the module is a small shared record the team updates
-- daily, so every column is either something a person decides or something
-- that follows directly from what they typed. A lead carries the few details
-- worth telling the rest of the team and a notes field for the rest.
--
-- Manager-only, the same way announcements and tax are. `is_manager()` reads
-- the `allowed_emails` table, so a manager listed only in the ALLOWED_EMAILS
-- env var has to be added there too — the database cannot see the env
-- fallback.

-- Strategies ---------------------------------------------------------------

-- A strategy is the approach somebody on the team wrote down and wants others
-- to reuse: how the first call opens, and how long to leave it before chasing
-- again. Leads point at one, so a card can say which script it is being worked
-- with and the cadence can prefill the next follow-up date.
create table if not exists public.sales_strategies (
  id bigserial primary key,
  title text not null,
  channel text not null default 'call' check (
    channel in ('call', 'email', 'linkedin', 'referral', 'event')
  ),
  -- The pitch: what to open with and what to ask. Free text on purpose, since
  -- a script that has to fit a form stops being the script anyone uses.
  approach text not null default '',
  -- What to do when the first attempt goes nowhere.
  follow_up_plan text not null default '',
  -- Days to leave between touches. Prefills the next follow-up date when a
  -- lead working this strategy is updated; 0 means the strategy sets no
  -- cadence and the date is always chosen by hand.
  follow_up_after_days integer not null default 3
    check (follow_up_after_days between 0 and 365),
  -- A strategy that stopped working stays on the record, because leads still
  -- reference it, but drops out of the picker.
  is_active boolean not null default true,
  -- A strategy belongs to whoever wrote it, and the team should see whose it
  -- is — that is the whole point of writing it down somewhere shared.
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_strategies_active_idx
on public.sales_strategies (is_active, title);

-- Leads --------------------------------------------------------------------

-- Contact details are one line each rather than a normalised contact record:
-- a cold lead is usually one person at one company, and splitting that across
-- tables would cost more to maintain by hand than it could ever return.
create table if not exists public.sales_leads (
  id bigserial primary key,
  company text not null,
  contact_name text not null default '',
  contact_role text not null default '',
  phone text not null default '',
  email text not null default '',
  -- Where the lead came from: a directory, a referral, a conference. Free text
  -- because the answer is different every time.
  source text not null default '',
  -- Nulled rather than cascaded when a strategy is deleted: losing the script
  -- must not lose the lead.
  strategy_id bigint references public.sales_strategies(id) on delete set null,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'following_up', 'meeting', 'proposal', 'won', 'lost')
  ),
  -- Who is chasing it. An email rather than a foreign key, because the owner
  -- may be a manager or a seat, and both are identified by email everywhere
  -- else in the app.
  owner_email text not null default '',
  -- The one date the list sorts and filters on: what is due today, and what
  -- was missed. Null means nothing is scheduled, which is how a won or lost
  -- lead ends up.
  next_follow_up_on date,
  -- Everything that does not deserve a column of its own.
  notes text not null default '',
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_leads_status_idx on public.sales_leads (status);
-- The list opens on what is due, so the follow-up date is the hot column.
create index if not exists sales_leads_follow_up_idx
on public.sales_leads (next_follow_up_on)
where next_follow_up_on is not null;
create index if not exists sales_leads_strategy_idx
on public.sales_leads (strategy_id);

-- Updates ------------------------------------------------------------------

-- One line per touch: what happened, on what day, written by whom. This is the
-- daily habit the module exists for, and it is append-only in spirit — an
-- update records what was true when it was written, so later corrections are
-- new updates rather than edits to old ones.
create table if not exists public.sales_lead_updates (
  id bigserial primary key,
  lead_id bigint not null references public.sales_leads(id) on delete cascade,
  -- The day the call happened, which is not always the day it was typed up.
  happened_on date not null default current_date,
  note text not null,
  -- The status the lead moved to with this update, or null when the update
  -- only added detail. A snapshot of the move for the timeline to read back:
  -- the lead's own `status` column stays the source of truth.
  status_after text check (
    status_after in ('new', 'contacted', 'following_up', 'meeting', 'proposal', 'won', 'lost')
  ),
  author_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists sales_lead_updates_lead_idx
on public.sales_lead_updates (lead_id, happened_on desc, id desc);

-- Housekeeping -------------------------------------------------------------

create or replace function public.touch_sales_record()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sales_strategies_touch on public.sales_strategies;
create trigger sales_strategies_touch
before update on public.sales_strategies
for each row
execute function public.touch_sales_record();

drop trigger if exists sales_leads_touch on public.sales_leads;
create trigger sales_leads_touch
before update on public.sales_leads
for each row
execute function public.touch_sales_record();

-- Access -------------------------------------------------------------------

alter table public.sales_strategies enable row level security;
alter table public.sales_leads enable row level security;
alter table public.sales_lead_updates enable row level security;

drop policy if exists "Managers manage sales strategies" on public.sales_strategies;
create policy "Managers manage sales strategies"
on public.sales_strategies
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Managers manage sales leads" on public.sales_leads;
create policy "Managers manage sales leads"
on public.sales_leads
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Managers manage sales lead updates" on public.sales_lead_updates;
create policy "Managers manage sales lead updates"
on public.sales_lead_updates
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

revoke all on public.sales_strategies from anon;
revoke all on public.sales_leads from anon;
revoke all on public.sales_lead_updates from anon;

grant select, insert, update, delete on public.sales_strategies to authenticated;
grant select, insert, update, delete on public.sales_leads to authenticated;
grant select, insert, update, delete on public.sales_lead_updates to authenticated;

grant usage, select on sequence public.sales_strategies_id_seq to authenticated;
grant usage, select on sequence public.sales_leads_id_seq to authenticated;
grant usage, select on sequence public.sales_lead_updates_id_seq to authenticated;

-- Seed ---------------------------------------------------------------------

-- Three strategies to start from, so the first lead added has something to be
-- worked with. They are ordinary rows: edit them, rename them, or delete them.
-- The insert only fires on an empty table, so nothing here comes back after
-- somebody clears it out.
insert into public.sales_strategies (title, channel, approach, follow_up_plan, follow_up_after_days)
select *
from (
  values
    (
      'Direct cold call',
      'call',
      'Ask for the person who owns delivery, not procurement. Open with the one thing we built that resembles their product, then ask what is currently sitting in their backlog. Do not pitch the team size or the rates on the first call.',
      'No answer: try twice more at different times of day before leaving it. Answered but not now: agree a month and call back then.',
      3
    ),
    (
      'Cold email, three touches',
      'email',
      'Short first mail: one line on what they do, one line on something comparable we shipped, one question. No attachments, no deck.',
      'Second mail after three working days with a different angle. Third and last after a week. Silence after that is an answer.',
      3
    ),
    (
      'LinkedIn to call',
      'linkedin',
      'Connect first with a note about their work, not ours. Once accepted, ask a real question about how they are staffed. Move to a call as soon as they reply.',
      'Leave a week between the connect and the first message. Nudge once. If a call is agreed, the lead moves to the direct call strategy.',
      7
    )
) as seed (title, channel, approach, follow_up_plan, follow_up_after_days)
where not exists (select 1 from public.sales_strategies);
