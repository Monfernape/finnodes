alter table public.seats
add column if not exists auth_user_id uuid unique,
add column if not exists login_email text unique,
add column if not exists people_status text not null default 'active' check (people_status in ('active', 'inactive')),
add column if not exists people_notes_enabled boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists seats_login_email_lower_unique
on public.seats (lower(login_email))
where login_email is not null;
