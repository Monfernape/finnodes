import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Seat } from "@/entities";
import { ExperienceLetterCreate } from "@/components/documents/ExperienceLetterCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "New Experience Letter",
};

export default async function NewExperienceLetterPage() {
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
    redirect("/me/experience-letters");
  }

  return (
    <ExperienceLetterCreate seat={seat} basePath="/me/experience-letters" />
  );
}
