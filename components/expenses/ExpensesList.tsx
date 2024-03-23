"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  const navigateToAddExpense = () => {
    router.push("expenses/add-expense");
  };

  return (
    <div>
      <div className="fixed top-4 right-4">
        <Button
          className="rounded-lg p-2 bg-gray-900 text-white shadow-lg flex items-center"
          size="large"
          variant="solid"
          onClick={navigateToAddExpense}
        >
          <svg
            className="h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Expense
        </Button>
      </div>

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
