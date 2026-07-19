import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isEmailAllowListed, normalizeEmail } from "@/utils/auth/allowlist";

type SeatAuthRecord = {
  id: number;
  auth_user_id: string | null;
  login_email: string | null;
  people_status: string | null;
};

const isActivePeopleSeat = (seat: SeatAuthRecord) =>
  seat.people_status === null || seat.people_status === "active";

export enum PeopleRole {
  Manager = "manager",
  Employee = "employee",
}

export type PeopleAccess =
  | {
      role: PeopleRole.Manager;
      email: string;
      seatId: null;
    }
  | {
      role: PeopleRole.Employee;
      email: string;
      seatId: number;
    };

const getSeatForUser = async (
  supabase: SupabaseClient,
  user: User,
  normalizedEmail: string,
) => {
  const { data: seatByAuthUserId, error: authUserIdError } = await supabase
    .from("seats")
    .select("id, auth_user_id, login_email, people_status")
    .eq("auth_user_id", user.id)
    .maybeSingle<SeatAuthRecord>();

  if (authUserIdError) {
    throw authUserIdError;
  }

  if (seatByAuthUserId && isActivePeopleSeat(seatByAuthUserId)) {
    return seatByAuthUserId;
  }

  const { data: seatByEmail, error: loginEmailError } = await supabase
    .from("seats")
    .select("id, auth_user_id, login_email, people_status")
    .eq("login_email", normalizedEmail)
    .is("auth_user_id", null)
    .maybeSingle<SeatAuthRecord>();

  if (loginEmailError) {
    throw loginEmailError;
  }

  if (!seatByEmail || !isActivePeopleSeat(seatByEmail)) {
    return null;
  }

  const { error: claimError } = await supabase
    .from("seats")
    .update({ auth_user_id: user.id })
    .eq("id", seatByEmail.id)
    .is("auth_user_id", null);

  if (claimError) {
    throw claimError;
  }

  return {
    ...seatByEmail,
    auth_user_id: user.id,
  };
};

export const resolvePeopleAccess = async (
  supabase: SupabaseClient,
  user: User | null,
): Promise<PeopleAccess | null> => {
  if (!user) {
    return null;
  }

  const normalizedEmail = normalizeEmail(user.email ?? null);
  if (!normalizedEmail) {
    return null;
  }

  if (await isEmailAllowListed(supabase, normalizedEmail)) {
    return {
      role: PeopleRole.Manager,
      email: normalizedEmail,
      seatId: null,
    };
  }

  const seat = await getSeatForUser(supabase, user, normalizedEmail);
  if (!seat) {
    return null;
  }

  return {
    role: PeopleRole.Employee,
    email: normalizedEmail,
    seatId: seat.id,
  };
};
