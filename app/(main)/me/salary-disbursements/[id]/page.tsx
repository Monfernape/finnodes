import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SalaryDisbursementLetter } from "@/entities";
import { SalaryDisbursementPreview } from "@/components/documents/SalaryDisbursementPreview";
import { SalaryDisbursementDownloadButton } from "@/components/documents/DocumentDownloadButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "Confirmation Letter",
};

export default async function MySalaryDisbursementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const { data: letter } = await supabase
    .from(DatabaseTable.SalaryDisbursementLetters)
    .select()
    .eq("id", id)
    .eq("seat_id", access.seatId)
    .maybeSingle<SalaryDisbursementLetter>();

  if (!letter) notFound();

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild className="h-11">
          <Link href="/me/salary-disbursements" prefetch>
            All letters
          </Link>
        </Button>
        <SalaryDisbursementDownloadButton letter={letter} />
      </div>
      <SalaryDisbursementPreview letter={letter} />
    </div>
  );
}
