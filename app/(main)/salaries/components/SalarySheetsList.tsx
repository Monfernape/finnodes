"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSalaryMonth, getSalarySheetTotals } from "@/lib/salary";

type Props = {
  sheets: SalarySheet[];
  items: SalarySheetItem[];
};

export const SalarySheetsList = ({ sheets, items }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const itemsBySheetId = items.reduce(
    (acc, item) => {
      if (!acc[item.salary_sheet_id]) {
        acc[item.salary_sheet_id] = [];
      }
      acc[item.salary_sheet_id].push(item);
      return acc;
    },
    {} as Record<number, SalarySheetItem[]>
  );

  const deleteSheet = async (sheetId: number) => {
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.SalarySheets)
        .delete()
        .eq("id", sheetId);
      if (error) {
        throw error;
      }

      toast({
        title: "Salary sheet deleted",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Salary sheet could not be deleted.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sheets.map((sheet) => {
        const sheetItems = itemsBySheetId[sheet.id] || [];
        const totals = getSalarySheetTotals(sheetItems);

        return (
          <Card key={sheet.id}>
            <CardHeader>
              <CardTitle>{formatSalaryMonth(sheet.month, sheet.year)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{sheetItems.length} employees</p>
                <p>Gross total: {formatCurrency(totals.gross)}</p>
                <p>Net total: {formatCurrency(totals.net)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/salaries/${sheet.id}`}>Open sheet</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/salaries/${sheet.id}/preview`}>Preview</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => deleteSheet(sheet.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {sheets.length === 0 && (
        <Card className="md:col-span-2 xl:col-span-3">
          <CardContent className="py-10 text-center text-muted-foreground">
            No salary sheets yet. Create the first month from the toolbar.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
