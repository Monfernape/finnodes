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
      canAccessSales: true;
    }
  | {
      role: PeopleRole.Employee;
      email: string;
      seatId: number;
      // True for an employee holding a title flagged as a sales role. An
      // employee can hold several titles; one sales title is enough.
      canAccessSales: boolean;
    };

/**
 * Asks the database the same question its row policies ask.
 *
 * Deliberately an RPC rather than the rule re-written in TypeScript: the menu
 * and the policies guarding the sales tables must agree, and the only way to
 * guarantee that is for both to read the same function.
 */
const canAccessSales = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.rpc("can_access_sales");

  if (error) {
    // A failure here must not open a door. The worst case is a salesperson who
    // has to reload, which is better than showing the module to someone whose
    // access could not be confirmed.
    return false;
  }

  return data === true;
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
    // Managers see everything, so there is nothing to ask the database.
    return {
      role: PeopleRole.Manager,
      email: normalizedEmail,
      seatId: null,
      canAccessSales: true,
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
    canAccessSales: await canAccessSales(supabase),
  };
};
