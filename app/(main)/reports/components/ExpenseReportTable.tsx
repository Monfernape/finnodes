import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { ExpenseReport } from "@/entities";

type Props = {
  expenseReport: ExpenseReport[];
};

export const ExpenseReportTable = ({ expenseReport }: Props) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-5">
        <h2 className="font-semibold tracking-tight">Expense allocation</h2>
        <p className="text-xs text-muted-foreground">By manager</p>
      </div>
      {expenseReport.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          No expense allocation is available for this period.
        </div>
      ) : (
        <>
          <div className="divide-y md:hidden">
            {expenseReport.map((expense) => (
              <article key={expense.managerName} className="px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-sm font-medium">{expense.managerName}</h3>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatCurrency(expense.totalExpense)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/70 p-2.5">
                    <p className="text-muted-foreground">Unit</p>
                    <p className="mt-0.5 truncate font-medium tabular-nums">{formatCurrency(expense.perUnitExpense)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 p-2.5">
                    <p className="text-muted-foreground">Shared</p>
                    <p className="mt-0.5 truncate font-medium tabular-nums">{formatCurrency(expense.sharedExpense)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 p-2.5">
                    <p className="text-muted-foreground">Employee</p>
                    <p className="mt-0.5 truncate font-medium tabular-nums">{formatCurrency(expense.perSeatExpense)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Manager Name</TableHead>
              <TableHead className="text-right">Per Unit Expense</TableHead>
              <TableHead className="text-right">Shared Expense</TableHead>
              <TableHead className="text-right">Per Seat Expense</TableHead>
              <TableHead className="text-right">Total Expense</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseReport.map((expense) => (
              <TableRow key={expense.managerName}>
                <TableCell>{expense.managerName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(expense.perUnitExpense)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(expense.sharedExpense)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(expense.perSeatExpense)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatCurrency(expense.totalExpense)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </>
      )}
    </section>
  );
};
