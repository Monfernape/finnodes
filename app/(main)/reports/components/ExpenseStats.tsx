"use client";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, ExpenseReport } from "@/entities";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  expenses: Expense[];
  expenseReport: ExpenseReport[];
};

const getCurrentSadqaTurn = (fromDate: string) => {
  const currentDate = fromDate ? new Date(fromDate) : new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentMonthName = currentDate.toLocaleString("default", {
    month: "long",
  });
  const turns = [
    "Usman Khalil",
    "Usman Qadir",
    "Usman Khalil",
    "Usman Qadir",
    "Usman Khalil",
    "Usman Qadir",
    "Usman Khalil",
    "Usman Qadir",
    "Usman Khalil",
    "Usman Qadir",
    "Usman Khalil",
    "Usman Qadir",
  ] as const;

  return {
    turn: turns[currentMonthIndex],
    month: currentMonthName,
  };
};

export function ExpenseStats({ expenses, expenseReport }: Props) {
  const searcParams = useSearchParams();
  const from = searcParams.get("from") || "";

  const totalExpenses = expenses.reduce(
    (acc, expense) => acc + expense.amount,
    0
  );

  const expensePerManager = expenseReport.map((report) => ({
    managerName: report.managerName,
    totalExpense: report.totalExpense,
  }));

  const sadqaAmount =
    expenses.find((expense) => expense.title.toLowerCase().includes("sadqa"))
      ?.amount || 0;

  const { turn, month } = useMemo(() => getCurrentSadqaTurn(from), [from]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
      {/** Total Expense */}
      <Card className="bg-gray-950 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">Total Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
              maximumFractionDigits: 0,
            }).format(totalExpenses)}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Across {expenses.length} {expenses.length === 1 ? "transaction" : "transactions"}
          </p>
        </CardContent>
      </Card>
      {/** Expense per manager */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">
            Expense per manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Comparing {expensePerManager.length} {expensePerManager.length === 1 ? "manager" : "managers"}
          </p>
          <div className="mt-4 h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensePerManager}>
                <XAxis dataKey="managerName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalExpense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {/** Sadqa Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">Sadqa Turn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{turn}</div>
          <p className="text-xs text-muted-foreground">For month of {month}</p>
          <div className="h-[80px] text-2xl font-bold py-4">
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
              maximumFractionDigits: 0,
            }).format(sadqaAmount)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
