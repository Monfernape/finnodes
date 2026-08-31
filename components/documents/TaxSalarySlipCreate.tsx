"use client";

import * as React from "react";
import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react";

import { SalarySheet, SalarySheetItem, Seat, TaxYear } from "@/entities";
import {
  TaxSlipPeriod,
  buildTaxSalarySlip,
  formatTaxSlipAmount,
  formatTaxSlipRange,
  getDefaultTaxYear,
  getTaxSlipMonthOptions,
  parseTaxSlipPeriodValue,
} from "@/lib/taxSalarySlip";
import { formatTaxYearPeriod } from "@/lib/tax";
import { downloadTaxSalarySlipPdf } from "@/lib/taxSalarySlipPdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TaxSalarySlipPreview } from "@/components/documents/TaxSalarySlipPreview";

type Props = {
  seat: Seat;
  /** Tax years the company has set up, newest first is not assumed. */
  taxYears: TaxYear[];
  salarySheets: SalarySheet[];
  /** Every sheet row that could belong to this employee, linked or not. */
  items: SalarySheetItem[];
};

const Summary = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-gray-200 bg-white/80 p-3">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold tabular-nums text-gray-950">
      {value}
    </p>
  </div>
);

export const TaxSalarySlipCreate = ({
  seat,
  taxYears,
  salarySheets,
  items,
}: Props) => {
  const { toast } = useToast();

  const years = React.useMemo(
    () => [...taxYears].sort((a, b) => b.tax_year - a.tax_year),
    [taxYears]
  );
  // Opens on the year the employee was last paid in, so the document is
  // populated rather than empty the moment the tab is opened.
  const defaultYear = React.useMemo(
    () => getDefaultTaxYear(taxYears, seat, salarySheets, items),
    [taxYears, seat, salarySheets, items]
  );

  const [taxYear, setTaxYear] = React.useState(
    defaultYear ? String(defaultYear.tax_year) : ""
  );
  const selectedYear = Number(taxYear);
  const monthOptions = React.useMemo(
    () => (selectedYear ? getTaxSlipMonthOptions(selectedYear) : []),
    [selectedYear]
  );

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [generated, setGenerated] = React.useState<{
    taxYear: number;
    from: TaxSlipPeriod;
    to: TaxSlipPeriod;
  } | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // The whole year is the selection somebody wants nine times out of ten, so
  // changing the year resets the range to July–June of that year.
  React.useEffect(() => {
    if (monthOptions.length === 0) return;
    setFrom(monthOptions[0].value);
    setTo(monthOptions[monthOptions.length - 1].value);
    // A document already on the page belongs to the year that was selected
    // when it was generated, so it goes rather than sitting under a picker
    // that no longer describes it.
    setGenerated(null);
  }, [monthOptions]);

  const fromPeriod = parseTaxSlipPeriodValue(from);
  const toPeriod = parseTaxSlipPeriodValue(to);
  const fromIndex = monthOptions.findIndex((option) => option.value === from);
  const toIndex = monthOptions.findIndex((option) => option.value === to);
  const isRangeValid = fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex;

  // A "to" month earlier than the "from" month is corrected rather than
  // rejected: picking a later start almost always means moving the whole range.
  const onFromChange = (value: string) => {
    setFrom(value);
    setGenerated(null);
    const nextIndex = monthOptions.findIndex(
      (option) => option.value === value
    );
    if (nextIndex > toIndex) {
      setTo(monthOptions[monthOptions.length - 1].value);
    }
  };

  const onToChange = (value: string) => {
    setTo(value);
    setGenerated(null);
  };

  const slip = React.useMemo(() => {
    if (!generated) return null;
    return buildTaxSalarySlip({
      seat,
      taxYear: generated.taxYear,
      from: generated.from,
      to: generated.to,
      salarySheets,
      items,
    });
  }, [generated, seat, salarySheets, items]);

  const generate = () => {
    if (!selectedYear || !fromPeriod || !toPeriod || !isRangeValid) return;
    setGenerated({ taxYear: selectedYear, from: fromPeriod, to: toPeriod });
  };

  const download = async () => {
    if (!slip || !generated) return;
    setIsDownloading(true);
    try {
      await downloadTaxSalarySlipPdf(seat, slip, generated.from, generated.to);
    } catch (error) {
      console.error("Tax salary slip PDF download failed", error);
      toast({
        title: "Error",
        description: "The PDF could not be generated. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (years.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <FileSpreadsheetIcon className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No tax year set up yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A tax salary slip covers July to June of a tax year. Add the year
            under Taxes first, then come back here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="print-hidden">
        <CardHeader>
          <CardTitle>Tax salary slip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            One statement for a whole tax year: what {seat.name} was paid month
            by month and what income tax was deducted from it. The figures come
            from the salary sheets actually dispatched, so the document
            reconciles against a bank statement.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tax-slip-year">Tax year</Label>
              <Select value={taxYear} onValueChange={setTaxYear}>
                <SelectTrigger id="tax-slip-year" className="h-11">
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year.id}
                      value={String(year.tax_year)}
                    >
                      {year.tax_year} · {formatTaxYearPeriod(year.tax_year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-slip-from">From</Label>
              <Select value={from} onValueChange={onFromChange}>
                <SelectTrigger id="tax-slip-from" className="h-11">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-slip-to">To</Label>
              <Select value={to} onValueChange={onToChange}>
                <SelectTrigger id="tax-slip-to" className="h-11">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option, index) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={index < fromIndex}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isRangeValid && (
            <p className="text-sm text-destructive">
              The last month cannot come before the first one.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-11 w-full sm:w-auto"
              onClick={generate}
              disabled={!isRangeValid}
            >
              Generate salary slip
            </Button>
          </div>
        </CardContent>
      </Card>

      {slip && generated && (
        <>
          <Card className="print-hidden">
            <CardHeader>
              <CardTitle>
                {formatTaxSlipRange(generated.from, generated.to)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {slip.monthsRecorded === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No salary sheet covers this period, so the statement has
                  nothing to report. Pick another period, or add the salary
                  sheets under Salaries first.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Summary
                      label="Months paid"
                      value={`${slip.monthsRecorded} of ${slip.months.length}`}
                    />
                    <Summary
                      label="Gross pay"
                      value={formatTaxSlipAmount(slip.grossSalary)}
                    />
                    <Summary
                      label="Tax deducted"
                      value={formatTaxSlipAmount(slip.taxDeducted)}
                    />
                    <Summary
                      label="Net pay"
                      value={formatTaxSlipAmount(slip.netSalary)}
                    />
                  </div>
                  {slip.monthsMissing.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      No salary was dispatched for{" "}
                      {slip.monthsMissing.join(", ")}. Those months print blank
                      rather than as a zero.
                    </p>
                  )}
                </>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={download}
                  disabled={isDownloading || slip.monthsRecorded === 0}
                  className="h-11"
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {isDownloading ? "Preparing PDF…" : "Download as PDF"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <TaxSalarySlipPreview
            seat={seat}
            slip={slip}
            from={generated.from}
            to={generated.to}
          />
        </>
      )}
    </div>
  );
};
