import { ExpenseFormBuilder } from "@/app/(main)/expenses/components/ExpenseFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { Manager, Expense, ManagerStatus } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";

const EditExpensePage = async ({ params }: { params: { id: string } }) => {
  const supabaseClient = createClient();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();
  const { data: expense } = await supabaseClient
    .from(DatabaseTable.Expenses)
    .select()
    .eq("id", params.id)
    .single();
  return <ExpenseFormBuilder managers={managers || []} expense={expense} />;
};

export default EditExpensePage;
