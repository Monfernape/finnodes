import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { SalarySheetsList } from "./components/SalarySheetsList";

const SalariesPage = async () => {
  const supabaseClient = await createClient();
  const { data: sheets } = await supabaseClient
    .from(DatabaseTable.SalarySheets)
    .select()
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("sheet_type", { ascending: false })
    .returns<SalarySheet[]>();
  const { data: items } = await supabaseClient
    .from(DatabaseTable.SalarySheetItems)
    .select()
    .returns<SalarySheetItem[]>();

  return <SalarySheetsList sheets={sheets || []} items={items || []} />;
};

export default SalariesPage;
