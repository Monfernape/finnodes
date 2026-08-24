import type { Metadata } from "next";
import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat, TaxSlab, TaxYear } from "@/entities";
import { TaxYearDetail } from "../components/TaxYearDetail";

export const metadata: Metadata = {
  title: "Tax Year",
};

const TaxYearPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const supabaseClient = await createClient();
  const { data: taxYear } = await supabaseClient
    .from(DatabaseTable.TaxYears)
    .select()
    .eq("id", id)
    .single();
  const { data: slabs } = await supabaseClient
    .from(DatabaseTable.TaxSlabs)
    .select()
    .eq("tax_year_id", id)
    .order("sort_order", { ascending: true })
    .returns<TaxSlab[]>();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  if (!taxYear) {
    return null;
  }

  return (
    <TaxYearDetail
      taxYear={taxYear}
      slabs={slabs || []}
      seats={seats || []}
    />
  );
};

export default TaxYearPage;
