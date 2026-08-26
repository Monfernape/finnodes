import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SalarySlip, Seat } from "@/entities";
import { SalarySlipCreate } from "@/components/documents/SalarySlipCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Salary Slip",
};

export default async function NewSalarySlipPage() {
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
    redirect("/me/salary-slips");
  }

  // The last payslip carries whatever was typed by hand, so those details are
  // offered again rather than asked for every month.
  const { data: previousSlip } = await supabase
    .from(DatabaseTable.SalarySlips)
    .select()
    .eq("seat_id", access.seatId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle<SalarySlip>();

  return (
    <SalarySlipCreate
      seat={seat}
      previousSlip={previousSlip ?? null}
      isManager={false}
      basePath="/me/salary-slips"
    />
  );
}
