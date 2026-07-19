import { notFound, redirect } from "next/navigation";

import { OneOnOneEditor } from "@/components/people/OneOnOneEditor";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { OneOnOne } from "@/entities";
import { getMonthName } from "@/lib/people";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MyOneOnOneMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const { year: yearParam, month: monthParam } = await params;
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    notFound();
  }

  const supabase = await createClient();
  const { data: oneOnOne } = await supabase
    .from(DatabaseTable.OneOnOnes)
    .select()
    .eq("seat_id", access.seatId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle<OneOnOne>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <p className="text-sm text-gray-500">Monthly 1:1</p>
        <h1 className="text-2xl font-semibold text-gray-950">
          {getMonthName(month)} {year}
        </h1>
      </div>
      <OneOnOneEditor
        seatId={access.seatId}
        year={year}
        month={month}
        initialOneOnOne={oneOnOne}
        afterSaveHref="/me/one-on-ones"
        isManager={false}
      />
    </div>
  );
}
