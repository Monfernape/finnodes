import type { Metadata } from "next";
import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { TaxSlab, TaxYear } from "@/entities";
import { TaxYearCreate } from "../components/TaxYearCreate";

export const metadata: Metadata = {
  title: "Add Tax Year",
};

const AddTaxYearPage = async () => {
  const supabaseClient = await createClient();
  const { data: taxYears } = await supabaseClient
    .from(DatabaseTable.TaxYears)
    .select()
    .order("tax_year", { ascending: false })
    .returns<TaxYear[]>();

  // The newest year on record seeds the form, since a new Finance Act usually
  // adjusts an existing table rather than replacing it outright.
  const latestTaxYear = taxYears?.[0];
  const { data: latestSlabs } = latestTaxYear
    ? await supabaseClient
        .from(DatabaseTable.TaxSlabs)
        .select()
        .eq("tax_year_id", latestTaxYear.id)
        .order("sort_order", { ascending: true })
        .returns<TaxSlab[]>()
    : { data: [] };

  return (
    <TaxYearCreate
      existingYears={(taxYears || []).map((taxYear) => taxYear.tax_year)}
      templateSlabs={latestSlabs || []}
      templateYear={latestTaxYear || null}
    />
  );
};

export default AddTaxYearPage;
