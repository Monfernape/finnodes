import type { Metadata } from "next";
import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { SalarySheetEditor } from "../components/SalarySheetEditor";

export const metadata: Metadata = {
  title: "Salary Sheet",
};

const SalarySheetPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const supabaseClient = await createClient();
  const { data: sheet } = await supabaseClient
    .from(DatabaseTable.SalarySheets)
    .select()
    .eq("id", id)
    .single();
  const { data: items } = await supabaseClient
    .from(DatabaseTable.SalarySheetItems)
    .select()
    .eq("salary_sheet_id", id)
    .order("sort_order", { ascending: true })
    .returns<SalarySheetItem[]>();

  if (!sheet) {
    return null;
  }

  return <SalarySheetEditor sheet={sheet} items={items || []} />;
};

export default SalarySheetPage;
