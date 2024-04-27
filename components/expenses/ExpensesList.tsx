"use client";

import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";

// Dummy data for expenses
const expenses = [
  { title: "Office Rent", type: "per_unit", amount: "$3000" },
  { title: "Electricity Bill", type: "shared", amount: "$500" },
  { title: "Water Cooler", type: "per_unit", amount: "$150" },
];

export const ExpensesList = () => {
  return (
    <div>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense, index) => (
              <TableRow key={index}>
                <TableCell>{expense.title}</TableCell>
                <TableCell>{expense.type}</TableCell>
                <TableCell>{expense.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
