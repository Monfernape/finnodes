create table public.review_notification_outbox (
  id bigserial primary key,
  review_section_id bigint not null references public.review_sections(id) on delete cascade,
  event_type text not null check (event_type in ('manager_review_published')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_section_id, event_type)
);

alter table public.review_notification_outbox enable row level security;

create policy "Managers manage review notification outbox"
on public.review_notification_outbox
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

revoke all on public.review_notification_outbox from anon;
grant select, insert, update on public.review_notification_outbox to authenticated;
grant all on public.review_notification_outbox to service_role;

revoke all on sequence public.review_notification_outbox_id_seq from anon;
grant usage, select on sequence public.review_notification_outbox_id_seq to authenticated;
grant all on sequence public.review_notification_outbox_id_seq to service_role;

create or replace function public.prevent_submitted_review_section_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'submitted' and not public.is_manager() then
      raise exception 'submitted reviews are locked';
    end if;

    if new.status = 'submitted' and old.submitted_at is null then
      new.submitted_at = now();
    end if;

    if new.status = 'published' and old.published_at is null then
      new.published_at = now();
    end if;
  else
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at = now();
    end if;

    if new.status = 'published' and new.published_at is null then
      new.published_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists review_sections_lock_guard on public.review_sections;
create trigger review_sections_lock_guard
before insert or update on public.review_sections
for each row
execute function public.prevent_submitted_review_section_updates();

create or replace function public.enqueue_manager_review_published_notification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.section_type <> 'manager_review' or new.status <> 'published' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.review_notification_outbox (
      review_section_id,
      event_type
    )
    values (
      new.id,
      'manager_review_published'
    )
    on conflict (review_section_id, event_type) do nothing;
  elsif old.status is distinct from 'published' then
    insert into public.review_notification_outbox (
      review_section_id,
      event_type
    )
    values (
      new.id,
      'manager_review_published'
    )
    on conflict (review_section_id, event_type) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists manager_review_published_notification on public.review_sections;
create trigger manager_review_published_notification
after insert or update of status on public.review_sections
for each row
execute function public.enqueue_manager_review_published_notification();
