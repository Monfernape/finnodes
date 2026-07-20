"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "@/components/icons";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { Expense, ExpenseType, Manager } from "@/entities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DatabaseTable } from "@/utils/supabase/db";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";

type Props = {
  managers: Manager[];
  expense?: Expense; // represent the case of edit expense
};

const EXPENSE_TYPES = [
  {
    value: ExpenseType.Shared,
    label: "Shared",
  },
  {
    value: ExpenseType.PerUnit,
    label: "Per Unit",
  },
  {
    value: ExpenseType.PerSeat,
    label: "Per Employee",
  },
];

const perUnitExpensSchema = z.object({
  type: z.literal(ExpenseType.PerUnit),
  unit_manager: z.string({
    required_error: "Per unit expense requires a unit manager",
  }),
  title: z.string({ required_error: "Title is required" }),
  amount: z.string({ required_error: "Amount cannot be empty" }),
  created_at: z.date(),
});

const baseExpenseSchema = z.object({
  type: z.enum([ExpenseType.Shared, ExpenseType.PerSeat]),
  title: z.string({ required_error: "Title is required" }),
  amount: z.string({ required_error: "Amount cannot be empty" }),
  created_at: z.date(),
});

const formSchema = z.discriminatedUnion("type", [
  perUnitExpensSchema,
  baseExpenseSchema,
]);

type ExpenseSchema = z.infer<typeof formSchema>;

export const ExpenseFormBuilder = ({ managers, expense }: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const form = useForm<ExpenseSchema>({
    resolver: zodResolver(formSchema),
    defaultValues:
      isEditMode && expense
        ? {
            title: expense.title,
            type: expense.type,
            amount: expense.amount.toString(),
            unit_manager: expense.unit_manager
              ? expense.unit_manager.toString()
              : undefined,
            created_at: new Date(expense.created_at),
          }
        : {
            title: undefined,
            type: ExpenseType.PerSeat,
            amount: undefined,
            created_at: new Date(),
          },
  });

  const isSubmitting = form.formState.isSubmitting;

  const saveExpense = async (values: ExpenseSchema) => {
    const payload = {
      ...values,
      amount: parseFloat(values.amount),
      unit_manager:
        values.type === ExpenseType.PerUnit
          ? Number(values.unit_manager)
          : null,
      created_at: values.created_at.toISOString(),
    };
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Expenses)
        .insert([payload])
        .select();
      if (error) {
        throw error;
      }
      markRouteStale(Routes.HOME);
      router.push(Routes.HOME);
      toast({
        title: "Expense saved",
        description: `Expense "${data?.[0].title}" has been saved.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Expense could not be saved. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const updateExpense = async (values: ExpenseSchema) => {
    const payload = {
      ...values,
      amount: parseFloat(values.amount),
      unit_manager:
        values.type === ExpenseType.PerUnit
          ? Number(values.unit_manager)
          : null,
      created_at: values.created_at.toISOString(),
    };
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Expenses)
        .update(payload)
        .eq("id", Number(id))
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Expense updated",
        description: `Expense "${data?.[0].title}" has been updated.`,
      });
      markRouteStale(Routes.HOME);
      router.push(Routes.HOME);
    } catch (error) {
      toast({
        title: "Error",
        description: "Expense could not be updated. Please try again later.",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: ExpenseSchema) {
    if (isEditMode) {
      return updateExpense(values);
    } else {
      return saveExpense(values);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto grid w-full max-w-3xl gap-5 pb-24 sm:rounded-2xl sm:border sm:bg-card sm:p-6 sm:pb-6 sm:shadow-sm lg:grid-cols-2"
      >
        <div className="space-y-1 lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {isEditMode ? "Expense details" : "New expense"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Add the amount, allocation method, and transaction date.
          </p>
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Rent, utility..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1.5">
                <FormLabel>Expense type</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="touch-feedback inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="About expense types"
                      >
                        <InfoIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs space-y-1.5 p-3 text-xs">
                      <p><strong>Shared:</strong> divided across managers.</p>
                      <p><strong>Per unit:</strong> assigned to one manager.</p>
                      <p><strong>Per employee:</strong> divided by employee count.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a expense type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("type") === ExpenseType.PerUnit && (
          <FormField
            control={form.control}
            name="unit_manager"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit manager</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem
                        key={manager.id}
                        value={manager.id.toString()}
                      >
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Amount" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="created_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-60" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:col-span-2 lg:flex lg:justify-end">
          <Button
            className="w-full lg:w-auto"
            type="submit"
            disabled={isSubmitting || !form.formState.isDirty}
          >
            {isSubmitting
              ? isEditMode
                ? "Updating…"
                : "Saving…"
              : isEditMode
                ? "Update expense"
                : "Save expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
