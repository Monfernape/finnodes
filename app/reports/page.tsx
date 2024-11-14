import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  Seat,
  Manager,
  Expense,
  ExpenseType,
  ExpenseReport,
  ManagerStatus,
} from "@/entities";
import { ExpenseReportTable } from "./components/ExpenseReportTable";
import { DateRangeFilter } from "../../components/shared/DateRangeFilter";
import { ExpenseStats } from "./components/ExpenseStats";

const Page = async ({
  searchParams,
}: {
  searchParams?: {
    from: string;
    to: string;
  };
}) => {
  const supabaseClient = createClient();
  const currentDate = new Date();

  // Get the first day of the current month
  let startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).toISOString();

  // Get the last day of the current month
  let endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).toISOString();

  // If 'from' and 'to' parameters are provided, update start and end date accordingly
  if (searchParams && searchParams.from && searchParams.to) {
    startDate = new Date(searchParams.from).toISOString();
    endDate = new Date(searchParams.to).toISOString();
  }

  const { data: _expenses = [] } = await supabaseClient
    .from(DatabaseTable.Expenses)
    .select()
    .order("created_at", { ascending: false })
    .gt("created_at", startDate)
    .lt("created_at", endDate)
    .returns<Expense[]>();

  const { data: _seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  const { data: _managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();

  const expenses = _expenses || [];
  const seats = _seats || [];
  const managers = _managers || [];

  const expenseGroups = expenses.reduce((acc, expense) => {
    if (!acc[expense.type]) {
      acc[expense.type] = [];
    }
    acc[expense.type].push(expense);
    return acc;
  }, {} as Record<ExpenseType, Expense[]>);

  const sharedExpenses = expenseGroups[ExpenseType.Shared] || [];
  const perUnitExpenses = expenseGroups[ExpenseType.PerUnit] || [];
  const perSeatExpenses = expenseGroups[ExpenseType.PerSeat] || [];

  const managersWithExpenseShare: ExpenseReport[] = managers.map((manager) => {
    const managerSeatShare = manager.seats.length / seats.length;
    const sharedExpense =
      sharedExpenses.reduce((acc, expense) => acc + expense.amount, 0) /
      managers.length;
    const perUnitExpense = perUnitExpenses
      .filter((expense) => expense.unit_manager === manager.id)
      .reduce((acc, expense) => acc + expense.amount, 0);
    const perSeatExpense =
      perSeatExpenses.reduce((acc, expense) => acc + expense.amount, 0) *
      managerSeatShare;
    const totalExpense = sharedExpense + perUnitExpense + perSeatExpense;
    return {
      managerName: manager.name,
      sharedExpense: Math.round(sharedExpense),
      perUnitExpense: Math.round(perUnitExpense),
      perSeatExpense: Math.round(perSeatExpense),
      totalExpense: Math.round(totalExpense),
    };
  });

  return (
    <div className="flex flex-col">
      <div className="flex justify-end">
        <DateRangeFilter />
      </div>
      <ExpenseReportTable expenseReport={managersWithExpenseShare} />
      <ExpenseStats
        expenses={expenses}
        expenseReport={managersWithExpenseShare}
      />
    </div>
  );
};

export default Page;
