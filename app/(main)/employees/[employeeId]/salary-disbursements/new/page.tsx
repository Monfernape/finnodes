import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SalarySlip, Seat } from "@/entities";
import { SalaryDisbursementCreate } from "@/components/documents/SalaryDisbursementCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Confirmation Letter",
};

export default async function NewEmployeeSalaryDisbursementPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  // Issuing for someone else is a manager action; the database checks this too.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/salary-disbursements");
  }

  const supabase = await createClient();
  const { data: seat } = await supabase
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", employeeId)
    .maybeSingle<Seat>();

  if (!seat) notFound();

  const { data: previousSlip } = await supabase
    .from(DatabaseTable.SalarySlips)
    .select()
    .eq("seat_id", seat.id)
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
      basePath={`/employees/${seat.id}/salary-disbursements`}
    />
  );
}
