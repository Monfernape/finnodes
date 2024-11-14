import React from "react";
import { ExpensesList } from "@/app/expenses/components/ExpensesList";
import { createClient } from "@/utils/supabase/server";
import { Expense, ExpenseType, Manager, ManagerStatus, Seat } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { DateRangeFilter } from "../../components/shared/DateRangeFilter";
import { ExpenseManagerFilter } from "./components/ExpenseManagerFilter";
import { ExpenseListSummary } from "./components/ExpenseListSummary";

const Expenses = async ({
  searchParams,
}: {
  searchParams?: {
    from?: string;
    to?: string;
    manager?: string;
  };
}) => {
  const supabaseClient = createClient();
  let currentDate = new Date();

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

  const { data } = await supabaseClient
    .from(DatabaseTable.Expenses)
    .select()
    .order("created_at", { ascending: false })
    .gt("created_at", startDate)
    .lt("created_at", endDate)
    .returns<Expense[]>();

  const { data: _managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();

  const { data: _seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  let expenses = data || [];
  const managers = _managers || [];
  const seats = _seats || [];
  let selectedManager: Manager | undefined;

  if (searchParams && searchParams.manager) {
    selectedManager = managers.find(
      (manager) => manager.id.toString() === searchParams.manager
    );

    if (selectedManager) {
      const managerSeatShare = selectedManager.seats.length / seats.length;

      const perUnitExpenses = expenses.filter(
        (expense) =>
          expense.type === ExpenseType.PerUnit &&
          expense.unit_manager === selectedManager!.id
      );
      const perSeatExpenses = expenses
        .filter((expense) => expense.type === ExpenseType.PerSeat)
        .map((expense) => ({
          ...expense,
          amount: expense.amount * managerSeatShare,
        }));

      const sharedExpenses = expenses
        .filter((expense) => expense.type === ExpenseType.Shared)
        .map((expense) => ({
          ...expense,
          amount: expense.amount / managers.length,
        }));

      expenses = [...perUnitExpenses, ...perSeatExpenses, ...sharedExpenses];
    }
  }

  const totalSumOfExpenses = expenses.reduce(
    (acc, expense) => acc + expense.amount,
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <ExpenseManagerFilter managers={managers} />
        <DateRangeFilter />
      </div>
      <ExpenseListSummary
        manager={selectedManager}
        totalSum={totalSumOfExpenses}
      />
      <ExpensesList expenses={expenses} managers={managers} />
    </div>
  );
};

export default Expenses;
