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
import { DatabaseTable, createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { ExpenseType, Manager } from "@/entities";

type Props = {
  managers: Manager[]
}

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
    label: "Per Seat",
  },
];

const perUnitExpensSchema = z.object({
  type: z.literal(ExpenseType.PerUnit),
  unit_manager: z.string({ required_error: "Per unit expense requires a unit manager"}),
  title: z.string({ required_error: "Title is required"}),
  amount: z.string( { required_error: "Amount cannot be empty"}),
});

const baseExpenseSchema = z.object({
  type: z.enum([ExpenseType.Shared, ExpenseType.PerSeat]),
  title: z.string({ required_error: "Title is required"}),
  amount: z.string( { required_error: "Amount cannot be empty"}),
});

const formSchema = z.discriminatedUnion('type',[perUnitExpensSchema, baseExpenseSchema]);

type ExpenseSchema = z.infer<typeof formSchema>;

export const AddExpense = ({ managers }: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<ExpenseSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: undefined,
      type: ExpenseType.Shared,
      amount: undefined,
    },
  });

  async function onSubmit(values: ExpenseSchema) {
    console.log({ values})
    const payload = {
      ...values,
      amount: parseFloat(values.amount),
      unit_manager: values.type === ExpenseType.PerUnit ? Number(values.unit_manager) : null
    };
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Expenses)
        .insert([payload])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Expense saved",
        description: `Expense "${data?.[0].title}" has been saved.`,
      });
      router.push(Routes.EXPENSES);
    } catch (error) {
      toast({
        title: "Error",
        description: "Expense could not be saved. Please try again later.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-3 px-10"
      >
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
              <FormLabel>
                Expense type{" "}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon style={{ width: 20, paddingTop: 14 }} />
                    </TooltipTrigger>
                    <TooltipContent>
                      Shared - Expense is shared among all managers. i.e.
                      Ahmed's lunch
                      <br />
                      Per Unit - Expense is calculated per unit - i.e. Employee
                      salary
                      <br />
                      Per Seat - Expense is calculated per seat - i.e. Rent,
                      kitchen items
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
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
                      <SelectItem key={manager.id} value={manager.id.toString()}>
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
        <Button className="w-full" type="submit">
          Save Expense
        </Button>
      </form>
    </Form>
  );
};
