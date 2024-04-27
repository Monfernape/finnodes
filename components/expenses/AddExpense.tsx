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
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { ExpenseType } from "@/entities";

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

const formSchema = z.object({
  title: z.string(),
  type: z.enum([ExpenseType.Shared, ExpenseType.PerUnit, ExpenseType.PerSeat]),
  amount: z.string(),
});

type ExpenseSchema = z.infer<typeof formSchema>;

export const AddExpense = () => {
  const supabaseClient = createClient();
  const { toast } = useToast()
  const router = useRouter();
  const form = useForm<ExpenseSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: ExpenseType.Shared,
      amount: "",
    },
  });

  async function onSubmit(values: ExpenseSchema) {
    try {
      const { data, error } = await supabaseClient
        .from("expenses")
        .insert([{...values, amount: parseFloat(values.amount)}])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Expense saved",
        description: `Expense "${data?.[0].title}" has been saved.`,
      })
      router.push(Routes.EXPENSES);
    } catch (error) {
      toast({
        title: "Error",
        description:  'Expense could not be saved. Please try again later.',
        variant: "destructive",
      })
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
