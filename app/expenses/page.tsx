import React from "react";
import { ExpensesList } from "@/app/expenses/components/ExpensesList";
import { createClient } from "@/utils/supabase/server";
import { Expense } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/client";

const Expenses = async () => {
  const supabaseClient = createClient();
  var currentDate = new Date();

  // Get the first day of the current month
  var startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).toISOString();

  // Get the last day of the current month
  var endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).toISOString();

  console.log({ startDate, endDate })

  const { data } = await supabaseClient
    .from(DatabaseTable.Expenses)
    .select()
    .order("created_at", { ascending: false })
    .gt("created_at", startDate)
    .lt("created_at", endDate)
    .returns<Expense[]>();
  return <ExpensesList expenses={data ?? []} />;
};

export default Expenses;
