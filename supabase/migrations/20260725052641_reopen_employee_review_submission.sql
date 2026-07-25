create or replace function public.reopen_employee_review_submission(
  target_review_id bigint,
  target_reviewer_seat_id bigint
)
returns table (
  reopened_sections bigint,
  reopened_feedback_requests bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_count bigint;
  feedback_request_count bigint;
begin
  if not public.is_manager() then
    raise exception 'only managers can reopen review submissions';
  end if;

  if not exists (
    select 1
    from public.performance_reviews
    where id = target_review_id
      and seat_id = target_reviewer_seat_id
  ) then
    raise exception 'performance review not found for employee';
  end if;

  update public.review_sections
  set
    status = 'draft',
    submitted_at = null,
    updated_at = now()
  where performance_review_id = target_review_id
    and section_type in ('self_review', 'manager_feedback')
    and status = 'submitted';

  get diagnostics section_count = row_count;

  update public.feedback_requests
  set
    status = 'draft',
    submitted_at = null,
    updated_at = now()
  where performance_review_id = target_review_id
    and reviewer_seat_id = target_reviewer_seat_id
    and status = 'submitted';

  get diagnostics feedback_request_count = row_count;

  return query
  select section_count, feedback_request_count;
end;
$$;

revoke all on function public.reopen_employee_review_submission(bigint, bigint)
from public, anon;

grant execute on function public.reopen_employee_review_submission(bigint, bigint)
to authenticated;
