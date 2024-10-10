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
  return (
    <div>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager Name</TableHead>
              <TableHead>Per Unit Expense</TableHead>
              <TableHead>Shared Expense</TableHead>
              <TableHead>Per Seat Expense</TableHead>
              <TableHead>Total Expense</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseReport.map((expense) => (
              <TableRow key={expense.managerName}>
                <TableCell>{expense.managerName}</TableCell>
                <TableCell>{expense.perUnitExpense} Rs.</TableCell>
                <TableCell>{expense.sharedExpense} Rs.</TableCell>
                <TableCell>{expense.perSeatExpense} Rs.</TableCell>
                <TableCell>{expense.totalExpense} Rs.</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
