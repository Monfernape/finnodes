import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem, TaxSlab } from "@/entities";
import { buildTaxSheet } from "@/lib/taxSheet";
import { TaxSheetView } from "../../components/TaxSheetView";

export const metadata: Metadata = {
  title: "Tax Sheet",
};

const TaxSheetPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  // Tax is manager-only; anyone else is sent back to their own workspace.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/one-on-ones");
  }

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
  const { data: salarySheets } = await supabaseClient
    .from(DatabaseTable.SalarySheets)
    .select()
    .returns<SalarySheet[]>();
  const { data: items } = await supabaseClient
    .from(DatabaseTable.SalarySheetItems)
    .select()
    .returns<SalarySheetItem[]>();

  if (!taxYear) {
    return null;
  }

  // Built on every request, so a salary sheet created today shows up here
  // without anything needing to be regenerated.
  const taxSheet = buildTaxSheet(
    taxYear,
    slabs || [],
    salarySheets || [],
    items || []
  );

  return <TaxSheetView taxSheet={taxSheet} />;
};

export default TaxSheetPage;
