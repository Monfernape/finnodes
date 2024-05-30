"use client";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, ExpenseReport } from "@/entities";

const data = [
  {
    revenue: 10400,
    subscription: 240,
  },
  {
    revenue: 14405,
    subscription: 300,
  },
  {
    revenue: 9400,
    subscription: 200,
  },
  {
    revenue: 8200,
    subscription: 278,
  },
  {
    revenue: 7000,
    subscription: 189,
  },
  {
    revenue: 9600,
    subscription: 239,
  },
  {
    revenue: 11244,
    subscription: 278,
  },
  {
    revenue: 26475,
    subscription: 189,
  },
];

type Props = {
  expenses: Expense[];
  expenseReport: ExpenseReport[];
};

export function ExpenseStats({ expenses, expenseReport }: Props) {
  const totalExpenses = expenses.reduce(
    (acc, expense) => acc + expense.amount,
    0
  );
  const expensePerManager = expenseReport.map((report) => ({
    managerName: report.managerName,
    totalExpense: report.totalExpense,
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">Total Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
            }).format(totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">
            Not Ready
          </p>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <Line
                  type="monotone"
                  strokeWidth={2}
                  dataKey="revenue"
                  activeDot={{
                    r: 6,
                    style: { fill: "var(--theme-primary)", opacity: 0.25 },
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">
            Expense per manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Random Figure</div>
          <p className="text-xs text-muted-foreground">
            Not Ready
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
    </div>
  );
}
