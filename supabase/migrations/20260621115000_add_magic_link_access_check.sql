create or replace function public.can_request_magic_link(email_to_check text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(nullif(trim(email_to_check), ''));
  has_people_columns boolean;
  seat_match boolean := false;
begin
  if normalized_email is null then
    return false;
  end if;

  if exists (
    select 1
    from public.allowed_emails
    where lower(trim(email)) = normalized_email
  ) then
    return true;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seats'
      and column_name in ('login_email', 'people_status')
    group by table_schema, table_name
    having count(*) = 2
  )
  into has_people_columns;

  if has_people_columns then
    execute
      'select exists (
        select 1
        from public.seats
        where lower(trim(login_email)) = $1
          and people_status = ''active''
      )'
      using normalized_email
      into seat_match;
  end if;

  return seat_match;
end;
$$;

revoke all on function public.can_request_magic_link(text) from public;
grant execute on function public.can_request_magic_link(text) to anon, authenticated;
