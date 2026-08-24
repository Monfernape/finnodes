import { redirect } from "next/navigation";

import { SalarySlip } from "@/entities";
import { SalarySlipsList } from "@/components/documents/DocumentLists";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MySalarySlipsPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  // Row level security already limits this to the caller's own slips; the
  // filter keeps the query honest about what it expects back.
  const { data: slips } = await supabase
    .from(DatabaseTable.SalarySlips)
    .select()
    .eq("seat_id", access.seatId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .returns<SalarySlip[]>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <SalarySlipsList
        slips={slips ?? []}
        basePath="/me/salary-slips"
        createPath="/me/salary-slips/new"
      />
    </div>
  );
}
