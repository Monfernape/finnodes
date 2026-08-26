import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SalarySlip, Seat } from "@/entities";
import { SalaryDisbursementCreate } from "@/components/documents/SalaryDisbursementCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Confirmation Letter",
};

export default async function NewSalaryDisbursementPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const { data: seat } = await supabase
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", access.seatId)
    .maybeSingle<Seat>();

  if (!seat) {
    redirect("/me/salary-disbursements");
  }

  // The bank was very likely typed on a payslip already, so it is offered
  // again rather than asked for twice.
  const { data: previousSlip } = await supabase
    .from(DatabaseTable.SalarySlips)
    .select()
    .eq("seat_id", access.seatId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle<SalarySlip>();

  return (
    <SalaryDisbursementCreate
      seat={seat}
      defaultBankName={
        (seat.bank_name || "").trim() || (previousSlip?.bank_name || "").trim()
      }
      basePath="/me/salary-disbursements"
    />
  );
}
