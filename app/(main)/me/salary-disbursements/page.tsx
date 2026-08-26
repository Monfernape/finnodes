import { redirect } from "next/navigation";

import { SalaryDisbursementLetter } from "@/entities";
import { SalaryDisbursementList } from "@/components/documents/DocumentLists";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MySalaryDisbursementsPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  // Row level security already limits this to the caller's own letters; the
  // filter keeps the query honest about what it expects back.
  const { data: letters } = await supabase
    .from(DatabaseTable.SalaryDisbursementLetters)
    .select()
    .eq("seat_id", access.seatId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .returns<SalaryDisbursementLetter[]>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <SalaryDisbursementList
        letters={letters ?? []}
        basePath="/me/salary-disbursements"
        createPath="/me/salary-disbursements/new"
      />
    </div>
  );
}
