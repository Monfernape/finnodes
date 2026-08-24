import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatSalarySheetType } from "@/lib/salary";
import {
  formatTaxAmount,
  formatTaxCurrency,
  formatTaxYearLabel,
  formatTaxYearPeriod,
} from "@/lib/tax";
import type { TaxSheet } from "@/lib/taxSheet";

type Props = {
  taxSheet: TaxSheet;
};

export const TaxSheetView = ({ taxSheet }: Props) => {
  const { taxYear, months, employees } = taxSheet;

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      <section className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight">
              {formatTaxYearLabel(taxYear.tax_year)} tax sheet
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatTaxYearPeriod(taxYear.tax_year)}
            </p>
          </div>
          <Badge variant="outline">
            {taxSheet.monthsCovered} of 12 months
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-muted/70 p-3">
            <p className="text-xs text-muted-foreground">Taxable pay</p>
            <p className="mt-0.5 truncate font-semibold tabular-nums">
              {formatTaxAmount(taxSheet.taxablePay)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/70 p-3">
            <p className="text-xs text-muted-foreground">Tax for the year</p>
            <p className="mt-0.5 truncate font-semibold tabular-nums">
              {formatTaxCurrency(taxSheet.tax)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-muted/70 p-3 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Taxable employees</p>
            <p className="mt-0.5 font-semibold">{employees.length}</p>
          </div>
        </div>
        {taxSheet.monthsMissing.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            No salary sheet yet for {taxSheet.monthsMissing.join(", ")}. Those
            months are counted as zero and will fill in on their own once a
            sheet exists.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-5">
          <h2 className="font-semibold tracking-tight">Month by month</h2>
          <p className="text-xs text-muted-foreground">
            Dispatches for a month are added together before the slab is applied
          </p>
        </div>
        <div className="divide-y md:hidden">
          {months.map((month) => (
            <article
              key={month.label}
              className={month.sheets.length === 0 ? "px-4 py-4 opacity-60" : "px-4 py-4"}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="truncate text-sm font-medium">{month.label}</h3>
                <p className="shrink-0 font-semibold tabular-nums">
                  {month.sheets.length === 0 ? "—" : formatTaxAmount(month.tax)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {month.sheets.length === 0
                  ? "No salary sheet"
                  : `${month.employeeCount} taxable · ${formatTaxAmount(
                      month.taxablePay
                    )} paid · ${month.sheets
                      .map((sheet) => formatSalarySheetType(sheet.sheet_type))
                      .join(" + ")}`}
              </p>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Salary sheets</TableHead>
                <TableHead className="text-right">Taxable staff</TableHead>
                <TableHead className="text-right">Taxable pay</TableHead>
                <TableHead className="text-right">Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => (
                <TableRow
                  key={month.label}
                  className={month.sheets.length === 0 ? "opacity-60" : undefined}
                >
                  <TableCell className="font-medium">{month.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {month.sheets.length === 0
                      ? "No sheet yet"
                      : month.sheets
                          .map((sheet) => formatSalarySheetType(sheet.sheet_type))
                          .join(" + ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {month.sheets.length === 0 ? "—" : month.employeeCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {month.sheets.length === 0
                      ? "—"
                      : formatTaxAmount(month.taxablePay)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {month.sheets.length === 0 ? "—" : formatTaxAmount(month.tax)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t bg-muted/40 px-4 py-3 text-sm sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="text-muted-foreground">
              {taxSheet.monthsCovered} months with a salary sheet
            </span>
            <span className="font-semibold tabular-nums">
              {formatTaxAmount(taxSheet.taxablePay)} paid ·{" "}
              {formatTaxAmount(taxSheet.tax)} tax
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-5">
          <h2 className="font-semibold tracking-tight">Tax by employee</h2>
          <p className="text-xs text-muted-foreground">
            Totalled across the months that have a salary sheet. Anyone under
            the exemption is left out.
          </p>
        </div>
        {employees.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No salary sheets fall inside this tax year yet.
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {employees.map((employee) => (
                <article key={employee.key} className="px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-sm font-medium">
                      {employee.name}
                    </h3>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatTaxAmount(employee.tax)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {employee.taxableMonths} taxable months ·{" "}
                    {formatTaxAmount(employee.taxablePay)} paid
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Taxable months</TableHead>
                    <TableHead className="text-right">Taxable pay</TableHead>
                    <TableHead className="text-right">Tax for the year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.key}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.designation}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {employee.taxableMonths}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(employee.taxablePay)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatTaxAmount(employee.tax)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {taxSheet.exemptEmployees.length > 0 && (
          <div className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <p>
              {taxSheet.exemptEmployees.length}{" "}
              {taxSheet.exemptEmployees.length === 1 ? "employee is" : "employees are"}{" "}
              not listed: pay stayed under the{" "}
              {formatTaxAmount(taxSheet.exemptionThreshold)} exemption all year,
              so no tax is due. {formatTaxAmount(taxSheet.exemptPay)} paid in
              total.
            </p>
            <p className="mt-1">
              {taxSheet.exemptEmployees.map((employee) => employee.name).join(", ")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
