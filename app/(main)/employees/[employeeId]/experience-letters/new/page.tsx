import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Seat } from "@/entities";
import { ExperienceLetterCreate } from "@/components/documents/ExperienceLetterCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Experience Letter",
};

export default async function NewEmployeeExperienceLetterPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/experience-letters");
  }

  const supabase = await createClient();
  const { data: seat } = await supabase
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", employeeId)
    .maybeSingle<Seat>();

  if (!seat) notFound();

  return (
    <ExperienceLetterCreate
      seat={seat}
      basePath={`/employees/${seat.id}/experience-letters`}
      canSetEndDate
    />
  );
}
