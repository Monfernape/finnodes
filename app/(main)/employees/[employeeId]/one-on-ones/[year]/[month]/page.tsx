import { notFound } from "next/navigation";

import { OneOnOneEditor } from "@/components/people/OneOnOneEditor";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { ManagerPrivateNote, OneOnOne, Seat } from "@/entities";
import { getMonthName } from "@/lib/people";
import { getServerPeopleAccess } from "@/utils/auth/server-access";

export default async function EmployeeOneOnOneMonthPage({
  params,
}: {
  params: Promise<{ employeeId: string; year: string; month: string }>;
}) {
  const { employeeId, year: yearParam, month: monthParam } = await params;
  const seatId = Number(employeeId);
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (!Number.isFinite(seatId) || !Number.isFinite(year) || month < 1 || month > 12) {
    notFound();
  }

  const supabase = await createClient();
  const access = await getServerPeopleAccess();
  const [{ data: employee }, { data: oneOnOne }] = await Promise.all([
    supabase.from(DatabaseTable.Seats).select().eq("id", seatId).maybeSingle<Seat>(),
    supabase
      .from(DatabaseTable.OneOnOnes)
      .select()
      .eq("seat_id", seatId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle<OneOnOne>(),
  ]);

  if (!employee) notFound();

  const { data: privateNotes } = await supabase
    .from(DatabaseTable.ManagerPrivateNotes)
    .select()
    .eq("seat_id", seatId)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<ManagerPrivateNote[]>();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <p className="text-sm text-gray-500">{employee.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
          {getMonthName(month)} {year}
        </h1>
      </div>
      <OneOnOneEditor
        seatId={seatId}
        year={year}
        month={month}
        initialOneOnOne={oneOnOne}
        afterSaveHref={`/employees/${seatId}/one-on-ones`}
        privateNotes={privateNotes ?? []}
        isManager
        managerEmail={access?.email ?? null}
      />
    </div>
  );
}
