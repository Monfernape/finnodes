import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ExperienceLetter } from "@/entities";
import { ExperienceLetterPreview } from "@/components/documents/ExperienceLetterPreview";
import { ExperienceLetterDownloadButton } from "@/components/documents/DocumentDownloadButton";
import { LETTER_SIGN_OFF } from "@/lib/experienceLetter";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "Experience Letter",
};

export default async function EmployeeExperienceLetterPage({
  params,
}: {
  params: Promise<{ employeeId: string; id: string }>;
}) {
  const { employeeId, id } = await params;
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/experience-letters");
  }

  const supabase = await createClient();
  const { data: letter } = await supabase
    .from(DatabaseTable.ExperienceLetters)
    .select()
    .eq("id", id)
    .eq("seat_id", employeeId)
    .maybeSingle<ExperienceLetter>();

  if (!letter) notFound();

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild className="h-11">
          <Link
            href={`/employees/${employeeId}?tab=experience-letters`}
            prefetch
          >
            All letters
          </Link>
        </Button>
        <ExperienceLetterDownloadButton letter={letter} />
      </div>
      <ExperienceLetterPreview
        letter={letter}
        signOffName={LETTER_SIGN_OFF.name}
        signOffTitle={LETTER_SIGN_OFF.title}
      />
    </div>
  );
}
