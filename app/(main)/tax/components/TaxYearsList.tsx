"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TaxSlab, TaxYear } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatTaxAmount,
  formatTaxCurrency,
  formatTaxYearLabel,
  formatTaxYearPeriod,
} from "@/lib/tax";
import type { TaxSheetSummary } from "@/lib/taxSheet";

type Props = {
  taxYears: TaxYear[];
  slabs: TaxSlab[];
  summaries: TaxSheetSummary[];
};

export const TaxYearsList = ({ taxYears, slabs, summaries }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const summaryByYearId = summaries.reduce(
    (acc, summary) => {
      acc[summary.taxYearId] = summary;
      return acc;
    },
    {} as Record<number, TaxSheetSummary>
  );

  const slabsByYearId = slabs.reduce(
    (acc, slab) => {
      if (!acc[slab.tax_year_id]) {
        acc[slab.tax_year_id] = [];
      }
      acc[slab.tax_year_id].push(slab);
      return acc;
    },
    {} as Record<number, TaxSlab[]>
  );

  const deleteTaxYear = async (taxYearId: number) => {
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.TaxYears)
        .delete()
        .eq("id", taxYearId);
      if (error) {
        throw error;
      }

      toast({
        title: "Tax year deleted",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Tax year could not be deleted.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {taxYears.map((taxYear) => {
        const yearSlabs = slabsByYearId[taxYear.id] || [];
        const summary = summaryByYearId[taxYear.id];

        return (
          <Card key={taxYear.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{formatTaxYearLabel(taxYear.tax_year)}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTaxYearPeriod(taxYear.tax_year)}
                  </p>
                </div>
                <Badge variant="outline">
                  {yearSlabs.length} {yearSlabs.length === 1 ? "slab" : "slabs"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-muted/70 p-3">
                  <p className="text-xs text-muted-foreground">Months covered</p>
                  <p className="mt-0.5 font-semibold">
                    {summary ? `${summary.monthsCovered} of 12` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    Taxable employees
                  </p>
                  <p className="mt-0.5 font-semibold">
                    {summary ? summary.taxableEmployees : "—"}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl bg-muted/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    Tax for the year
                  </p>
                  <p className="mt-0.5 truncate font-semibold tabular-nums">
                    {summary ? formatTaxCurrency(summary.tax) : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {summary
                      ? `${formatTaxAmount(summary.taxablePay)} taxable pay`
                      : "No salary sheets yet"}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Button asChild>
                  <Link href={`/tax/${taxYear.id}/sheet`}>Open tax sheet</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/tax/${taxYear.id}`}>Slabs &amp; rates</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => deleteTaxYear(taxYear.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {taxYears.length === 0 && (
        <Card className="md:col-span-2 xl:col-span-3">
          <CardContent className="py-10 text-center text-muted-foreground">
            No tax years yet. Add the first one from the toolbar.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
