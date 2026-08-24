import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Seat } from "@/entities";
import { SalarySlipCreate } from "@/components/documents/SalarySlipCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Salary Slip",
};

export default async function NewEmployeeSalarySlipPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  // Issuing for someone else is a manager action; the database checks this too.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/salary-slips");
  }

  const supabase = await createClient();
  const { data: seat } = await supabase
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", employeeId)
    .maybeSingle<Seat>();

  if (!seat) notFound();

  return (
    <SalarySlipCreate
      seat={seat}
      basePath={`/employees/${seat.id}/salary-slips`}
    />
  );
}
