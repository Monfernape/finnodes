import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Seat, TaxCpr } from "@/entities";
import { TaxCprManage } from "@/components/documents/TaxCprManage";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export const metadata: Metadata = {
  title: "Tax CPR",
};

export default async function MyTaxCprPage() {
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
    redirect("/me/salary-slips");
  }

  // RLS already narrows this to the caller's own rows, the same guarantee
  // every other self-service document in the app relies on.
  const { data: cprs } = await supabase
    .from(DatabaseTable.TaxCprs)
    .select()
    .eq("seat_id", seat.id)
    .order("year", { ascending: false })
    .returns<TaxCpr[]>();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tax CPR</h1>
        <p className="text-sm text-muted-foreground">
          The FBR receipt for tax deposited on your behalf, for whichever
          period your consultant needs — pick a period below to download it.
        </p>
      </div>
      <TaxCprManage seat={seat} cprs={cprs ?? []} isManager={false} />
    </div>
  );
}
