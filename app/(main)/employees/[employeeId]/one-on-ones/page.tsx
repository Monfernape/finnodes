import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { OneOnOne, Seat } from "@/entities";
import {
  getCurrentYear,
  getMonthName,
  getOneOnOneStatusLabel,
} from "@/lib/people";

export default async function EmployeeOneOnOnesPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const id = Number(employeeId);
  if (!Number.isFinite(id)) notFound();

  const year = getCurrentYear();
  const supabase = await createClient();
  const [{ data: employee }, { data: oneOnOnes }] = await Promise.all([
    supabase.from(DatabaseTable.Seats).select().eq("id", id).maybeSingle<Seat>(),
    supabase
      .from(DatabaseTable.OneOnOnes)
      .select()
      .eq("seat_id", id)
      .eq("year", year)
      .returns<OneOnOne[]>(),
  ]);

  if (!employee) notFound();

  const byMonth = new Map((oneOnOnes ?? []).map((item) => [item.month, item]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <p className="text-sm text-gray-500">{employee.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
          1:1 workspace
        </h1>
        <p className="mt-1 text-sm text-gray-500">{year}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
          const oneOnOne = byMonth.get(month);
          return (
            <Link
              key={month}
              href={`/employees/${employee.id}/one-on-ones/${year}/${month}`}
              prefetch
            >
              <Card className="rounded-xl border-gray-200 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <span className="font-semibold text-gray-950">
                      {getMonthName(month)}
                    </span>
                    <p className="mt-1 text-sm text-gray-500">
                      Agenda, notes, and manager context
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {getOneOnOneStatusLabel(oneOnOne?.status)}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
