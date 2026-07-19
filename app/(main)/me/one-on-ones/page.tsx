import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { OneOnOne } from "@/entities";
import {
  getCurrentYear,
  getMonthName,
  getOneOnOneStatusLabel,
} from "@/lib/people";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MyOneOnOnesPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const year = getCurrentYear();
  const supabase = await createClient();
  const { data: oneOnOnes } = await supabase
    .from(DatabaseTable.OneOnOnes)
    .select()
    .eq("seat_id", access.seatId)
    .eq("year", year)
    .returns<OneOnOne[]>();

  const byMonth = new Map((oneOnOnes ?? []).map((item) => [item.month, item]));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="text-sm text-gray-500">{year}</p>
      <div className="grid gap-3">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
          const oneOnOne = byMonth.get(month);
          return (
            <Link
              key={month}
              href={`/me/one-on-ones/${year}/${month}`}
              prefetch
            >
              <Card className="rounded-lg transition-colors hover:bg-gray-50">
                <CardContent className="flex items-center justify-between p-4">
                  <span className="font-medium text-gray-950">
                    {getMonthName(month)}
                  </span>
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
