import React from "react";
import { redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat, TaxSlab, TaxYear } from "@/entities";
import { TaxYearsList } from "./components/TaxYearsList";

const TaxPage = async () => {
  // Tax is manager-only; anyone else is sent back to their own workspace.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const { data: taxYears } = await supabaseClient
    .from(DatabaseTable.TaxYears)
    .select()
    .order("tax_year", { ascending: false })
    .returns<TaxYear[]>();
  const { data: slabs } = await supabaseClient
    .from(DatabaseTable.TaxSlabs)
    .select()
    .order("sort_order", { ascending: true })
    .returns<TaxSlab[]>();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  return (
    <TaxYearsList
      taxYears={taxYears || []}
      slabs={slabs || []}
      seats={seats || []}
    />
  );
};

export default TaxPage;
