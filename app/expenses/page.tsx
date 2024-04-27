import React from "react";
import { ExpensesList } from "@/components/expenses/ExpensesList";
import { createClient } from "@/utils/supabase/server";
import { Expense } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/client";

export const Expenses = async () => {
  const supabaseClient = createClient();
  const { data } = await supabaseClient.from(DatabaseTable.Expenses).select().returns<Expense[]>();
  return <ExpensesList expenses={data ?? []} />;
};

export default Expenses;
