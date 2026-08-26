import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { sortSalarySheets } from "@/lib/salary";
import { SalarySheetsList } from "./components/SalarySheetsList";

const SalariesPage = async () => {
  const supabaseClient = await createClient();
  const { data: sheets } = await supabaseClient
    .from(DatabaseTable.SalarySheets)
    .select()
    // Roughly right from the database; `sortSalarySheets` settles the order
    // within a month, which no column sort can express.
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .returns<SalarySheet[]>();
  const { data: items } = await supabaseClient
    .from(DatabaseTable.SalarySheetItems)
    .select()
    .returns<SalarySheetItem[]>();

  return (
    <SalarySheetsList
      sheets={sortSalarySheets(sheets || [])}
      items={items || []}
    />
  );
};

export default SalariesPage;
