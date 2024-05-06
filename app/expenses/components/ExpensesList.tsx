"use client";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { ExpenseType } from "@/entities";
import { Expense } from "@/entities";
import { formatDate } from "@/lib/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Button } from "../../../components/ui/button";
import { EllipsesIcon } from "../../../components/icons";
import { useRouter } from "next/navigation";
import { DatabaseTable, createClient } from "@/utils/supabase/client";
import { useToast } from "../../../components/ui/use-toast";

const ExpenseTypeMapper = {
  [ExpenseType.Shared]: "Shared",
  [ExpenseType.PerUnit]: "Per Unit",
  [ExpenseType.PerSeat]: "Per Seat",
};

type Props = {
  expenses: Expense[];
};

export const ExpensesList = ({ expenses }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const supabaseClient = createClient();

  const handleEditExpense = (expenseId: number) => {
    router.push(`/expenses/${expenseId}/edit`);
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.Expenses)
        .delete()
        .match({ id: expenseId });
      if (error) {
        throw error;
      }
      toast({
        title: "Expense deleted",
        description: `Expense has been deleted.`,
      });
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the expense.",
      });
    }
  };

  return (
    <div>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.title}</TableCell>
                <TableCell>{ExpenseTypeMapper[expense.type]}</TableCell>
                <TableCell>{expense.amount} Rs.</TableCell>
                <TableCell>{formatDate(expense.created_at)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <EllipsesIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditExpense(expense.id)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
