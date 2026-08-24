import { Seat, TaxSlab, TaxYear } from "@/entities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatRate,
  formatSlabFormula,
  formatSlabRange,
  formatTaxAmount,
  formatTaxCurrency,
  formatTaxYearLabel,
  formatTaxYearPeriod,
  getSeatTaxRows,
  getTaxTotals,
  sortSlabs,
} from "@/lib/tax";

type Props = {
  taxYear: TaxYear;
  slabs: TaxSlab[];
  seats: Seat[];
};

export const TaxYearDetail = ({ taxYear, slabs, seats }: Props) => {
  const orderedSlabs = sortSlabs(slabs);
  const rows = getSeatTaxRows(seats, slabs, taxYear);
  const totals = getTaxTotals(rows);

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      <section className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight">
              {formatTaxYearLabel(taxYear.tax_year)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatTaxYearPeriod(taxYear.tax_year)}
            </p>
          </div>
          <Badge variant="outline">
            {taxYear.surcharge_threshold === null
              ? "No surcharge"
              : `${formatRate(taxYear.surcharge_rate)} surcharge above ${formatTaxAmount(
                  taxYear.surcharge_threshold
                )}`}
          </Badge>
        </div>
        {taxYear.notes && (
          <p className="mt-3 text-sm text-muted-foreground">{taxYear.notes}</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-5">
          <h2 className="font-semibold tracking-tight">Slabs</h2>
          <p className="text-xs text-muted-foreground">
            Annual taxable income, salaried individuals
          </p>
        </div>
        {orderedSlabs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            This tax year has no slabs yet.
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {orderedSlabs.map((slab) => (
                <article key={slab.id} className="px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-sm font-medium">
                      {formatSlabRange(slab)}
                    </h3>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatRate(slab.rate_percent)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSlabFormula(slab)}
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taxable income</TableHead>
                    <TableHead className="text-right">Fixed amount</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedSlabs.map((slab) => (
                    <TableRow key={slab.id}>
                      <TableCell className="font-medium">
                        {formatSlabRange(slab)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(slab.fixed_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(slab.rate_percent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSlabFormula(slab)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-5">
          <h2 className="font-semibold tracking-tight">Tax by employee</h2>
          <p className="text-xs text-muted-foreground">
            Active staff, annual income taken as monthly gross across twelve months
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No active employees to calculate tax for.
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {rows.map((row) => (
                <article key={row.seat.id} className="px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-sm font-medium">
                      {row.seat.name}
                    </h3>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatTaxAmount(row.monthlyTax)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt>Annual income</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {formatTaxAmount(row.annualIncome)}
                      </dd>
                    </div>
                    <div>
                      <dt>Annual tax</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {formatTaxAmount(row.annualTax)}
                      </dd>
                    </div>
                    <div>
                      <dt>Take home</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {formatTaxAmount(row.monthlyTakeHome)}
                      </dd>
                    </div>
                    <div>
                      <dt>Effective rate</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {row.effectiveRate.toFixed(2)}%
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Monthly gross</TableHead>
                    <TableHead className="text-right">Annual income</TableHead>
                    <TableHead className="text-right">Annual tax</TableHead>
                    <TableHead className="text-right">Monthly tax</TableHead>
                    <TableHead className="text-right">Monthly take home</TableHead>
                    <TableHead className="text-right">Effective rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.seat.id}>
                      <TableCell className="font-medium">
                        {row.seat.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(row.monthlyGross)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(row.annualIncome)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(row.annualTax)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(row.monthlyTax)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaxAmount(row.monthlyTakeHome)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.effectiveRate.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t bg-muted/40 px-4 py-3 text-sm sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="text-muted-foreground">
                  {totals.taxable} of {rows.length} employees above the exemption
                </span>
                <span className="font-semibold tabular-nums">
                  {formatTaxCurrency(totals.annualTax)} a year ·{" "}
                  {formatTaxAmount(totals.monthlyTax)} a month
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
