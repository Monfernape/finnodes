import { AddExpense } from "@/app/expenses/components/AddExpense";
import { createClient } from "@/utils/supabase/server";
import { Manager } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/client";

const AddExpensePage = async () => {
  const supabaseClient = createClient();
  const { data: managers } = await supabaseClient.from(DatabaseTable.Managers).select().returns<Manager[]>();
  return <AddExpense managers={managers || []} />
};

export default AddExpensePage