import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SalarySlip, SalarySlipLine } from "@/entities";
import { SalarySlipPreview } from "@/components/documents/SalarySlipPreview";
import { SalarySlipDownloadButton } from "@/components/documents/DocumentDownloadButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "Salary Slip",
};

export default async function MySalarySlipPage({
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
  const { data: slip } = await supabase
    .from(DatabaseTable.SalarySlips)
    .select()
    .eq("id", id)
    .eq("seat_id", access.seatId)
    .maybeSingle<SalarySlip>();

  if (!slip) notFound();

  const { data: lines } = await supabase
    .from(DatabaseTable.SalarySlipLines)
    .select()
    .eq("salary_slip_id", slip.id)
    .order("sort_order", { ascending: true })
    .returns<SalarySlipLine[]>();

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild className="h-11">
          <Link href="/me/salary-slips" prefetch>
            All salary slips
          </Link>
        </Button>
        <SalarySlipDownloadButton slip={slip} lines={lines ?? []} />
      </div>
      <SalarySlipPreview slip={slip} lines={lines ?? []} />
    </div>
  );
}
