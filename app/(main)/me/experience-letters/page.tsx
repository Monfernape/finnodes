import { redirect } from "next/navigation";

import { ExperienceLetter } from "@/entities";
import { ExperienceLettersList } from "@/components/documents/DocumentLists";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MyExperienceLettersPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const { data: letters } = await supabase
    .from(DatabaseTable.ExperienceLetters)
    .select()
    .eq("seat_id", access.seatId)
    .order("issued_on", { ascending: false })
    .returns<ExperienceLetter[]>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <ExperienceLettersList
        letters={letters ?? []}
        basePath="/me/experience-letters"
        createPath="/me/experience-letters/new"
      />
    </div>
  );
}
