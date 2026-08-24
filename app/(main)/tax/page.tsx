import React from "react";
import { redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem, TaxSlab, TaxYear } from "@/entities";
import { buildTaxSheet, summariseTaxSheet } from "@/lib/taxSheet";
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
  const { data: salarySheets } = await supabaseClient
    .from(DatabaseTable.SalarySheets)
    .select()
    .returns<SalarySheet[]>();
  const { data: items } = await supabaseClient
    .from(DatabaseTable.SalarySheetItems)
    .select()
    .returns<SalarySheetItem[]>();

  // Each card previews the sheet it opens, so the figures are built from the
  // same source rather than from a separate projection. Summarised here so the
  // browser never receives every salary row.
  const summaries = (taxYears || []).map((taxYear) =>
    summariseTaxSheet(
      buildTaxSheet(
        taxYear,
        (slabs || []).filter((slab) => slab.tax_year_id === taxYear.id),
        salarySheets || [],
        items || []
      )
    )
  );

  return (
    <TaxYearsList
      taxYears={taxYears || []}
      slabs={slabs || []}
      summaries={summaries}
    />
  );
};

export default TaxPage;
