import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { SalarySheetPreview } from "../../components/SalarySheetPreview";
import { PrintButton } from "../../components/PrintButton";
import { Button } from "@/components/ui/button";

const SalarySheetPreviewPage = async ({
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

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/salaries/${sheet.id}`}>Back to editor</Link>
        </Button>
        <PrintButton />
      </div>
      <SalarySheetPreview sheet={sheet} items={items || []} />
    </div>
  );
};

export default SalarySheetPreviewPage;
