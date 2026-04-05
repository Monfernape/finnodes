import type { Metadata } from "next";
import { ExpenseFormBuilder } from "@/app/(main)/expenses/components/ExpenseFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { Manager, ManagerStatus } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";

export const metadata: Metadata = {
  title: "Add Expense",
};

const AddExpensePage = async () => {
  const supabaseClient = await createClient();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();
  return <ExpenseFormBuilder managers={managers || []} />;
};

export default AddExpensePage;
