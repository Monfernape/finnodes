import type { Metadata } from "next";
import React from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  Seat,
  Manager,
  Expense,
  ExpenseType,
  ExpenseReport,
  ManagerStatus,
  Loan,
  LoanPayment,
} from "@/entities";
import { ExpenseReportTable } from "./components/ExpenseReportTable";
import { DateRangeFilter } from "../../../components/shared/DateRangeFilter";
import { LoanRecoveryReport } from "./components/LoanRecoveryReport";
import { getLoanRecoveryItems } from "@/lib/loan";

export const metadata: Metadata = {
  title: "Reports",
};

const ExpenseStats = dynamic(
  () =>
    import("./components/ExpenseStats").then((module) => module.ExpenseStats),
  {
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    ),
  }
);

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}) => {
  const resolvedSearchParams = await searchParams;
  const supabaseClient = await createClient();
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
  if (resolvedSearchParams?.from && resolvedSearchParams?.to) {
    startDate = new Date(resolvedSearchParams.from).toISOString();
    endDate = new Date(resolvedSearchParams.to).toISOString();
  }

  const [
    { data: _expenses = [] },
    { data: _seats },
    { data: _managers },
    { data: _loans },
    { data: _loanPayments },
  ] = await Promise.all([
    supabaseClient
      .from(DatabaseTable.Expenses)
      .select()
      .order("created_at", { ascending: false })
      .gt("created_at", startDate)
      .lt("created_at", endDate)
      .returns<Expense[]>(),
    supabaseClient
      .from(DatabaseTable.Seats)
      .select()
      .returns<Seat[]>(),
    supabaseClient
      .from(DatabaseTable.Managers)
      .select()
      .neq("status", ManagerStatus.Inactive)
      .returns<Manager[]>(),
    supabaseClient
      .from(DatabaseTable.Loans)
      .select()
      .returns<Loan[]>(),
    supabaseClient
      .from(DatabaseTable.LoanPayments)
      .select()
      .returns<LoanPayment[]>(),
  ]);

  const expenses = _expenses || [];
  const seats = _seats || [];
  const managers = _managers || [];
  const loans = _loans || [];
  const loanPayments = _loanPayments || [];
  const loanPaymentsByLoanId = loanPayments.reduce(
    (acc, payment) => {
      if (!acc[payment.loan_id]) {
        acc[payment.loan_id] = [];
      }
      acc[payment.loan_id].push(payment);
      return acc;
    },
    {} as Record<number, LoanPayment[]>
  );
  const loanRecoveryItems = getLoanRecoveryItems(
    loans,
    loanPaymentsByLoanId,
    seats,
    managers,
    resolvedSearchParams?.from ? new Date(resolvedSearchParams.from) : new Date()
  );

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
      <div className="pt-4">
        <LoanRecoveryReport items={loanRecoveryItems} />
      </div>
    </div>
  );
};

export default Page;
