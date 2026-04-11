import React from "react";

import { Expense, ExpenseType, Manager, ManagerStatus, Seat } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { createClient } from "@/utils/supabase/server";

import { DateRangeFilter } from "../../../components/shared/DateRangeFilter";
import { ExpenseManagerFilter } from "./components/ExpenseManagerFilter";
import { ExpenseListSummary } from "./components/ExpenseListSummary";
import { ExpensesList } from "./components/ExpensesList";

type ExpenseSearchParams = {
  from?: string;
  to?: string;
  manager?: string;
};

export const ExpensesPageContent = async ({
  searchParams,
}: {
  searchParams: Promise<ExpenseSearchParams>;
}) => {
  const resolvedSearchParams = await searchParams;
  const supabaseClient = await createClient();
  const currentDate = new Date();

  let startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).toISOString();

  let endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).toISOString();

  if (resolvedSearchParams?.from && resolvedSearchParams?.to) {
    startDate = new Date(resolvedSearchParams.from).toISOString();
    endDate = new Date(resolvedSearchParams.to).toISOString();
  }

  const [{ data }, { data: _managers }, { data: _seats }] = await Promise.all([
    supabaseClient
      .from(DatabaseTable.Expenses)
      .select()
      .order("created_at", { ascending: false })
      .gt("created_at", startDate)
      .lt("created_at", endDate)
      .returns<Expense[]>(),
    supabaseClient
      .from(DatabaseTable.Managers)
      .select()
      .neq("status", ManagerStatus.Inactive)
      .returns<Manager[]>(),
    supabaseClient
      .from(DatabaseTable.Seats)
      .select()
      .returns<Seat[]>(),
  ]);

  let expenses = data || [];
  const managers = _managers || [];
  const seats = _seats || [];
  let selectedManager: Manager | undefined;

  if (resolvedSearchParams?.manager) {
    selectedManager = managers.find(
      (manager) => manager.id.toString() === resolvedSearchParams.manager
    );

    if (selectedManager) {
      const managerId = selectedManager.id;
      const managerSeatShare = selectedManager.seats.length / seats.length;

      const perUnitExpenses = expenses.filter(
        (expense) =>
          expense.type === ExpenseType.PerUnit &&
          expense.unit_manager === managerId
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <ExpenseManagerFilter managers={managers} />
        <DateRangeFilter className="w-full sm:w-auto" />
      </div>
      <ExpenseListSummary
        manager={selectedManager}
        totalSum={totalSumOfExpenses}
      />
      <ExpensesList expenses={expenses} managers={managers} />
    </div>
  );
};
