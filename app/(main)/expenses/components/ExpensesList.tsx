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
import { formatDate, formatShortDate } from "@/lib/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Button } from "../../../../components/ui/button";
import { EllipsesIcon, InfoIcon } from "../../../../components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "../../../../components/ui/use-toast";
import { capitalize } from "@/lib/string";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatabaseTable } from "@/utils/supabase/db";
import { CalendarDaysIcon, ReceiptTextIcon } from "lucide-react";

const ExpenseTypeMapper = {
  [ExpenseType.Shared]: "Shared",
  [ExpenseType.PerUnit]: "Per Unit",
  [ExpenseType.PerSeat]: "Per Employee",
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

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);

  const renderActions = (expense: Expense) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${expense.title}`}
          className="transition-opacity md:opacity-40 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <EllipsesIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 rounded-xl p-1.5">
        <DropdownMenuItem
          className="min-h-10 rounded-lg px-3"
          onClick={() => handleEditExpense(expense.id)}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-10 rounded-lg px-3 text-red-600 focus:bg-red-50 focus:text-red-700"
          onClick={() => handleDeleteExpense(expense.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-semibold tracking-tight">Recent expenses</h2>
          <p className="text-xs text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        {isFilteredView && manager && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="About filtered amounts">
                  <InfoIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Amounts shown are allocated to {manager.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <ReceiptTextIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No expenses in this period</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Try another date range or manager filter.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y md:hidden">
            {expenses.map((expense) => (
              <article
                key={expense.id}
                className="flex min-w-0 items-center gap-3 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <ReceiptTextIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-sm font-medium">
                      {capitalize(expense.title)}
                    </h3>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatAmount(expense.amount)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{ExpenseTypeMapper[expense.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {formatShortDate(expense.created_at)}
                    </span>
                  </div>
                </div>
                <div className="-mr-2 shrink-0">{renderActions(expense)}</div>
              </article>
            ))}
          </div>

          <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">
              Amount
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
              <TableCell className="text-right tabular-nums">
                {formatAmount(expense.amount)}
              </TableCell>
              <TableCell>{formatDate(expense.created_at)}</TableCell>
              <TableCell className="text-right">
                {renderActions(expense)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
          </Table>
        </>
      )}
    </section>
  );
};
