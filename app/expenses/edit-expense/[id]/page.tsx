import { ExpenseFormBuilder } from "@/app/expenses/components/ExpenseFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { Manager, Expense } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/client";

const EditExpensePage = async ({ params }: { params: { id: string } }) => {
  const supabaseClient = createClient();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .returns<Manager[]>();
  const { data: expense } = await supabaseClient
    .from(DatabaseTable.Expenses)
    .select()
    .eq("id", params.id)
    .single();
  return <ExpenseFormBuilder managers={managers || []} expense={expense} />;
};

export default EditExpensePage;
