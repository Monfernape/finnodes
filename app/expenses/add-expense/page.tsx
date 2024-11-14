import { ExpenseFormBuilder } from "@/app/expenses/components/ExpenseFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { Manager, ManagerStatus } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";

const AddExpensePage = async () => {
  const supabaseClient = createClient();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();
  return <ExpenseFormBuilder managers={managers || []} />;
};

export default AddExpensePage;
