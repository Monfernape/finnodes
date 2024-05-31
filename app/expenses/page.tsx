import React from "react";
import { ExpensesList } from "@/app/expenses/components/ExpensesList";
import { createClient } from "@/utils/supabase/server";
import { Expense } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/client";
import { DateRangeFilter } from "../../components/shared/DateRangeFilter";

const Expenses = async ({
  searchParams,
}: {
  searchParams?: {
    from: string;
    to: string;
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

  return (
    <div className="flex flex-col">
      <div className="flex justify-end">
        <DateRangeFilter />
      </div>
      <ExpensesList expenses={data ?? []} />
    </div>
  );
};

export default Expenses;
