-- `build_disbursement_summary` shipped as a security-definer function that any
-- signed-in user could execute against any seat id, returning that person's
-- salary amounts and payment dates. It has no caller check of its own, unlike
-- `get_salary_disbursements`, which filters on `is_manager() or
-- is_employee_self()`.
--
-- It is only ever meant to be called from inside `generate_salary_slip`, which
-- checks the caller before it runs and reaches this as a definer function of
-- its own, so nothing legitimate needs the grant.
--
-- The previous migration has been corrected too; this exists so a database
-- that already applied the earlier version is closed as well. It is a harmless
-- no-op on a database created after the fix.
revoke all on function public.build_disbursement_summary(bigint, integer, integer)
from public;
revoke all on function public.build_disbursement_summary(bigint, integer, integer)
from authenticated;
