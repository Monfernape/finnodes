"use client";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { ExpenseType, Manager } from "@/entities";
import { Expense } from "@/entities";
import { formatDate } from "@/lib/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Button } from "../../../components/ui/button";
import { EllipsesIcon, InfoIcon } from "../../../components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { DatabaseTable, createClient } from "@/utils/supabase/client";
import { useToast } from "../../../components/ui/use-toast";
import { capitalize } from "@/lib/string";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ExpenseTypeMapper = {
  [ExpenseType.Shared]: "Shared",
  [ExpenseType.PerUnit]: "Per Unit",
  [ExpenseType.PerSeat]: "Per Seat",
};

type Props = {
  expenses: Expense[];
  managers: Manager[];
};

export const ExpensesList = ({ expenses, managers }: Props) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabaseClient = createClient();
  const isFilteredView = searchParams.has("manager");
  const manager = managers.find(
    (x) => x.id.toString() === searchParams.get("manager")
  );

  const handleEditExpense = (expenseId: number) => {
    router.push(`/expenses/edit-expense/${expenseId}`);
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
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the expense.",
      });
    }
  };

  return (
    <div className="py-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>
              Amount{" "}
              {isFilteredView && manager && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon style={{ width: 20, paddingTop: 14 }} />
                    </TooltipTrigger>
                    <TooltipContent>
                      Filtered view - expenses belonging to {manager.name}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{capitalize(expense.title)}</TableCell>
              <TableCell>{ExpenseTypeMapper[expense.type]}</TableCell>
              <TableCell>{new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
            }).format(expense.amount)}</TableCell>
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
                      className="text-red-500"
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
  );
};
