import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat, TaxSlab, TaxYear } from "@/entities";
import { TaxYearsList } from "./components/TaxYearsList";

const TaxPage = async () => {
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
